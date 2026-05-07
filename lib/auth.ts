import { betterAuth } from "better-auth";
import { APIError, isAPIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, captcha, magicLink } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { randomInt } from "node:crypto";
import { authEmailLayout } from "./auth-email";
import { getAppUrl } from "./deployment";
import { sendEmail } from "./email";
import { prisma } from "./prisma";

const appUrl = getAppUrl();
const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
const captchaProtectedEndpoints = ["/sign-in/email", "/sign-in/social"];
const magicCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const magicCodeLength = 10;
const magicCodeGroupSize = 5;
const magicCodeExpiryMinutes = 5;
const loginLockPrefix = "login-lock:";
const maxFailedLoginAttempts = 3;
const loginLockMinutes = 5;

const generateMagicCode = () =>
  Array.from(
    { length: magicCodeLength },
    () => magicCodeAlphabet[randomInt(0, magicCodeAlphabet.length)],
  ).join("");

const formatMagicCode = (token: string) =>
  token.match(new RegExp(`.{1,${magicCodeGroupSize}}`, "g"))?.join("-") ??
  token;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loginLockIdentifier(email: string) {
  return `${loginLockPrefix}${email.toLowerCase()}`;
}

function readLoginLock(value?: string | null) {
  if (!value) return { count: 0, lockedUntil: null as Date | null };

  try {
    const parsed = JSON.parse(value) as {
      count?: number;
      lockedUntil?: string | null;
    };
    return {
      count: Number(parsed.count || 0),
      lockedUntil: parsed.lockedUntil ? new Date(parsed.lockedUntil) : null,
    };
  } catch {
    return { count: Number(value) || 0, lockedUntil: null as Date | null };
  }
}

async function checkLoginLock(email: string) {
  const identifier = loginLockIdentifier(email);
  const record = await prisma.verification.findFirst({
    where: { identifier },
  });

  if (!record) return;

  const lock = readLoginLock(record.value);
  const now = new Date();
  if (lock.lockedUntil && lock.lockedUntil > now) {
    const seconds = Math.max(
      1,
      Math.ceil((lock.lockedUntil.getTime() - now.getTime()) / 1000),
    );
    throw APIError.from("TOO_MANY_REQUESTS", {
      code: "LOGIN_LOCKED",
      message: `Too many failed login attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
    });
  }

  await prisma.verification.deleteMany({ where: { identifier } });
}

async function clearLoginLock(email: string) {
  await prisma.verification.deleteMany({
    where: { identifier: loginLockIdentifier(email) },
  });
}

async function recordFailedLogin(email: string) {
  const identifier = loginLockIdentifier(email);
  const existing = await prisma.verification.findFirst({
    where: { identifier },
  });
  const lock = readLoginLock(existing?.value);
  const count = lock.count + 1;
  const now = new Date();
  const lockedUntil =
    count >= maxFailedLoginAttempts
      ? new Date(now.getTime() + loginLockMinutes * 60 * 1000)
      : null;
  const expiresAt =
    lockedUntil ?? new Date(now.getTime() + loginLockMinutes * 60 * 1000);
  const value = JSON.stringify({
    count,
    lockedUntil: lockedUntil?.toISOString() ?? null,
  });

  if (existing) {
    await prisma.verification.update({
      where: { id: existing.id },
      data: { value, expiresAt },
    });
  } else {
    await prisma.verification.create({
      data: {
        id: `${identifier}:${Date.now()}`,
        identifier,
        value,
        expiresAt,
      },
    });
  }

  if (lockedUntil) {
    throw APIError.from("TOO_MANY_REQUESTS", {
      code: "LOGIN_LOCKED",
      message: `Too many failed login attempts. Try again in ${loginLockMinutes} minutes.`,
    });
  }
}

export const auth = betterAuth({
  baseURL: appUrl,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUser = user as typeof user & { role?: string | null };
      if (resetUser.role?.toUpperCase() === "SUPER_ADMIN") {
        return;
      }

      const resetUrl = new URL("/reset-password", appUrl);
      resetUrl.searchParams.set("token", token);
      const html = authEmailLayout({
        preview: "Reset your Zerve password.",
        eyebrow: "Password Recovery",
        headline: "Create a new password",
        message:
          "We received a request to reset your Zerve password. Use the secure link below to choose a new one.",
        badge: "Reset Password",
        tone: "success",
        rows: [
          ["Account", escapeHtml(user.email)],
          ["Link Expires", "1 hour"],
        ],
        ctaHref: resetUrl.toString(),
        ctaLabel: "Reset Password",
        footer:
          "If you did not request this reset, ignore this email and your current password will stay the same.",
      });
      const sent = await sendEmail(
        user.email,
        "Reset your Zerve password",
        [
          `Hi ${user.name || "there"},`,
          "",
          "Use this link to create a new Zerve password:",
          resetUrl.toString(),
          "",
          "This link expires in 1 hour. If you did not request this, ignore this email.",
        ].join("\n"),
        { html },
      );

      if (!sent) {
        throw new Error("Password reset email could not be sent.");
      }
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      disableSignUp: true,
    },
  },
  plugins: [
    admin({
      defaultRole: "OFFICER",
      adminRoles: ["SUPER_ADMIN"],
      roles: {
        OFFICER: userAc,
        APPROVER: userAc,
        ADMIN: userAc,
        SUPER_ADMIN: adminAc,
      },
    }),
    magicLink({
      expiresIn: magicCodeExpiryMinutes * 60,
      disableSignUp: true,
      generateToken: async () => generateMagicCode(),
      sendMagicLink: async ({ email, token, url }) => {
        const formattedCode = formatMagicCode(token);
        const html = authEmailLayout({
          preview: `Your Zerve magic code is ${formattedCode}.`,
          eyebrow: "Secure Sign In",
          headline: "Your magic code is ready",
          message:
            "Use this one-time code to continue signing in to your Zerve account, or open the secure sign-in link below.",
          badge: "Magic Code",
          rows: [
            ["Email", escapeHtml(email)],
            [
              "Code",
              `<span style="font-size:22px;font-weight:850;letter-spacing:.22em;">${escapeHtml(formattedCode)}</span>`,
            ],
            ["Expires", `${magicCodeExpiryMinutes} minutes`],
          ],
          ctaHref: url,
          ctaLabel: "Open Sign In Link",
          footer:
            "If you did not request this code, ignore this email and no changes will be made to your account.",
        });
        const sent = await sendEmail(
          email,
          "Your Zerve magic code",
          [
            "Use this magic code to sign in to Zerve:",
            "",
            formattedCode,
            "",
            `This code expires in ${magicCodeExpiryMinutes} minutes.`,
            "You can also open this link on the same device:",
            url,
          ].join("\n"),
          { html },
        );

        if (!sent) {
          throw new Error("Magic code email could not be sent.");
        }
      },
      rateLimit: {
        window: 60,
        max: 5,
      },
    }),
    ...(recaptchaSecretKey
      ? [
          captcha({
            provider: "google-recaptcha",
            secretKey: recaptchaSecretKey,
            endpoints: captchaProtectedEndpoints,
          }),
        ]
      : []),
  ],
  hooks: {
    before: async (ctx: any) => {
      if (ctx.path !== "/sign-in/email") return;

      const email = String(ctx.body?.email || "")
        .trim()
        .toLowerCase();
      if (!email) return;

      await checkLoginLock(email);
    },
    after: async (ctx: any) => {
      if (ctx.path !== "/sign-in/email") return {};

      const email = String(ctx.body?.email || "")
        .trim()
        .toLowerCase();
      if (!email) return {};

      const response = ctx.context.returned;
      if (!isAPIError(response)) {
        await clearLoginLock(email);
        return {};
      }

      if (response.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
        await recordFailedLogin(email);
      }

      return {};
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
});
