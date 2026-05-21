import { getEmailSettings } from "@/lib/system-settings";
import nodemailer from "nodemailer";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function genericEmailLayout({
  subject,
  text,
}: {
  subject: string;
  text: string;
}) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#eef2f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(lines[0] || subject)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.14);">
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,#064e3b 0%,#0f766e 45%,#2563eb 100%);">
                <div style="padding:28px 32px 42px;">
                  <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#d1fae5;font-weight:800;">UniSpace Notification</div>
                  <h1 style="margin:18px 0 0;color:#ffffff;font-size:30px;line-height:1.18;font-weight:850;">${escapeHtml(subject)}</h1>
                  <p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.65;">${escapeHtml(lines[0] || "You have a new update from UniSpace.")}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <div style="border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;padding:18px 20px;">
                  ${lines
                    .map(
                      (line) =>
                        `<p style="margin:0 0 12px;color:#1f2937;font-size:14px;line-height:1.65;">${escapeHtml(line)}</p>`,
                    )
                    .join("")}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 34px;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.55;">This is an automated notification from UniSpace. Please do not reply directly to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  options?: { html?: string },
) {
  const settings = await getEmailSettings();
  const host = settings.smtpHost || process.env.SMTP_HOST;
  const port = settings.smtpPort ?? Number(process.env.SMTP_PORT || 465);
  const user =
    settings.smtpUser ||
    process.env.SMTP_USER ||
    settings.senderEmail ||
    process.env.SENDER_EMAIL;
  const pass =
    settings.smtpPass ||
    process.env.SMTP_PASSWORD ||
    process.env.SENDER_PASSWORD;
  const senderEmail = settings.senderEmail || process.env.SENDER_EMAIL || user;
  const senderName =
    settings.senderName || process.env.SENDER_NAME || "UniSpace";

  if (!host || !port || !user || !pass || !senderEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev email fallback]", {
        to,
        subject,
        text,
        html: options?.html,
      });
      return true;
    }

    console.error("Incomplete SMTP settings.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text,
      html: options?.html || genericEmailLayout({ subject, text }),
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
