"use server";

import ActionResult from "@/app/components/ActionResult";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

type SystemSettingsData = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName: string;
};

export type SystemEmailSettings = SystemSettingsData;

export type UserNotificationPreferences = {
  emailNotificationsEnabled: boolean;
};

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

function field(data: FormData, key: string, fallback = "") {
  return String(data.get(key) ?? fallback).trim();
}

function numberField(data: FormData, key: string, fallback: number) {
  const value = Number(data.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user || user.role?.toUpperCase() !== "SUPER_ADMIN") {
    return { ok: false, message: "Only super admins can manage settings." };
  }
  return { ok: true };
}

export async function getSystemSettings(): Promise<
  ActionResult<SystemSettingsData>
> {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.ok) {
      return {
        success: false,
        message: authCheck.message || "Only super admins can manage settings.",
      };
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: "SYSTEM" },
      create: { id: "SYSTEM" },
      update: {},
    });

    return {
      success: true,
      data: {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        senderEmail: settings.senderEmail,
        senderName: settings.senderName,
      },
    };
  } catch (error) {
    console.error("Settings load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load settings.",
    };
  }
}

export async function getEmailSettings(): Promise<SystemEmailSettings> {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "SYSTEM" },
    create: { id: "SYSTEM" },
    update: {},
  });

  return {
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    senderEmail: settings.senderEmail,
    senderName: settings.senderName,
  };
}

export async function getUserNotificationPreferences(): Promise<
  ActionResult<UserNotificationPreferences>
> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, message: "Unauthorized access." };
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailNotificationsEnabled: true },
    });

    return {
      success: true,
      data: {
        emailNotificationsEnabled:
          account?.emailNotificationsEnabled ?? true,
      },
    };
  } catch (error) {
    console.error("Notification preferences load failed:", error);
    return {
      success: false,
      message:
        (error as Error).message ||
        "Failed to load notification preferences.",
    };
  }
}

export async function updateUserNotificationPreferences(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, message: "Unauthorized access." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailNotificationsEnabled:
          data.get("emailNotificationsEnabled") === "on",
      },
    });

    revalidatePath("/user/settings");
    return { success: true, message: "Notification preferences updated." };
  } catch (error) {
    console.error("Notification preferences update failed:", error);
    return {
      success: false,
      message:
        (error as Error).message ||
        "Failed to update notification preferences.",
    };
  }
}

export async function updateSystemSettings(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.ok) {
      return {
        success: false,
        message: authCheck.message || "Only super admins can manage settings.",
      };
    }

    const smtpHost = field(data, "smtpHost");
    const smtpPort = numberField(data, "smtpPort", 465);
    const smtpUser = field(data, "smtpUser");
    const smtpPass = field(data, "smtpPass");
    const senderEmail = field(data, "senderEmail");
    const senderName = field(data, "senderName", "Zerve");
    const resolvedSenderEmail = senderEmail || smtpUser;

    if (!smtpHost) {
      return { success: false, message: "SMTP host is required." };
    }
    if (!smtpPort || smtpPort < 1 || smtpPort > 65535) {
      return { success: false, message: "SMTP port must be valid." };
    }
    if (!smtpUser) {
      return { success: false, message: "SMTP user is required." };
    }
    if (!smtpPass) {
      return { success: false, message: "SMTP password is required." };
    }
    if (!resolvedSenderEmail) {
      return { success: false, message: "Sender email is required." };
    }
    if (!senderName) {
      return { success: false, message: "Sender name is required." };
    }

    await prisma.systemSettings.upsert({
      where: { id: "SYSTEM" },
      create: {
        id: "SYSTEM",
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        senderEmail: resolvedSenderEmail,
        senderName,
      },
      update: {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        senderEmail: resolvedSenderEmail,
        senderName,
      },
    });

    revalidatePath("/user/settings");
    return { success: true, message: "Settings updated." };
  } catch (error) {
    console.error("Settings update failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update settings.",
    };
  }
}
