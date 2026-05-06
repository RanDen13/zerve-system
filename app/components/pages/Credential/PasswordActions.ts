"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

type PasswordActionResult = {
  success: boolean;
  message?: string;
};

function passwordIsStrong(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function setInitialPassword(password: string): Promise<PasswordActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "You need to sign in with your magic code first." };
    }

    if (!passwordIsStrong(password)) {
      return {
        success: false,
        message: "Password must be at least 8 characters with uppercase, number, and special character.",
      };
    }

    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "credential",
        password: {
          not: null,
        },
      },
    });

    if (credentialAccount) {
      return { success: false, message: "This account already has a password." };
    }

    await auth.api.setPassword({
      headers: await headers(),
      body: {
        newPassword: password,
      },
    });

    return { success: true, message: "Password created." };
  } catch (error) {
    console.error("Initial password setup failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to set password.",
    };
  }
}
