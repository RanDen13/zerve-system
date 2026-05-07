"use server";

import ActionResult from "@/app/components/ActionResult";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

function passwordIsStrong(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function requestPasswordResetEmail(
  email: string,
): Promise<ActionResult<void>> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, message: "Email is required." };
    }

    await auth.api.requestPasswordReset({
      headers: await headers(),
      body: {
        email: normalizedEmail,
        redirectTo: "/reset-password",
      },
    });

    return {
      success: true,
      message: "If this email exists, a reset link has been sent.",
    };
  } catch (error) {
    console.error("Password reset request failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to send reset link.",
    };
  }
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<ActionResult<void>> {
  try {
    if (!token) {
      return { success: false, message: "Reset token is missing." };
    }
    if (!passwordIsStrong(password)) {
      return {
        success: false,
        message:
          "Password must be at least 8 characters with uppercase, number, and special character.",
      };
    }

    const verification = await prisma.verification.findFirst({
      where: { identifier: `reset-password:${token}` },
    });

    if (!verification || verification.expiresAt < new Date()) {
      return { success: false, message: "Reset link is invalid or expired." };
    }

    const user = await prisma.user.findUnique({
      where: { id: verification.value },
      select: { email: true, role: true },
    });

    if (!user) {
      return { success: false, message: "Account not found." };
    }

    await auth.api.resetPassword({
      headers: await headers(),
      body: {
        token,
        newPassword: password,
      },
    });

    await prisma.verification.deleteMany({
      where: { identifier: `login-lock:${user.email.toLowerCase()}` },
    });

    return { success: true, message: "Password reset. You can log in now." };
  } catch (error) {
    console.error("Password reset failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to reset password.",
    };
  }
}
