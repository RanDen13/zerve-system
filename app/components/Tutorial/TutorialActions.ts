"use server";

import ActionResult from "@/app/components/ActionResult";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";

const tutorialRoles = ["OFFICER", "APPROVER", "ADMIN"] as const;

type TutorialRole = (typeof tutorialRoles)[number];
export type TutorialProgressStatus = "STARTED" | "COMPLETED" | "CANCELLED";

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

function normalizeTutorialRole(role?: string | null): TutorialRole | null {
  const normalized = role?.toUpperCase();
  return tutorialRoles.includes(normalized as TutorialRole)
    ? (normalized as TutorialRole)
    : null;
}

async function getAuthorizedTutorialRole() {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false as const,
      message: "Unauthorized access.",
    };
  }

  if (user.role?.toUpperCase() === "SUPER_ADMIN") {
    return {
      ok: false as const,
      message: "The tutorial is not available for super admins.",
    };
  }

  const role = normalizeTutorialRole(user.role);
  if (!role) {
    return {
      ok: false as const,
      message: "Your account role is not valid for this tutorial.",
    };
  }

  return { ok: true as const, user, role };
}

export async function startTutorialProgress(): Promise<ActionResult<void>> {
  try {
    const authCheck = await getAuthorizedTutorialRole();
    if (!authCheck.ok) {
      return { success: false, message: authCheck.message };
    }

    const now = new Date();
    await prisma.userTutorialProgress.upsert({
      where: {
        userId_role: {
          userId: authCheck.user.id,
          role: authCheck.role,
        },
      },
      create: {
        id: uuid(),
        userId: authCheck.user.id,
        role: authCheck.role,
        status: "STARTED",
        startedAt: now,
      },
      update: {
        status: "STARTED",
        startedAt: now,
        completedAt: null,
        cancelledAt: null,
      },
    });

    return { success: true, message: "Tutorial started." };
  } catch (error) {
    console.error("Tutorial start failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to start the tutorial.",
    };
  }
}

export async function saveTutorialProgress(
  status: Exclude<TutorialProgressStatus, "STARTED">,
): Promise<ActionResult<void>> {
  try {
    if (status !== "COMPLETED" && status !== "CANCELLED") {
      return { success: false, message: "Invalid tutorial status." };
    }

    const authCheck = await getAuthorizedTutorialRole();
    if (!authCheck.ok) {
      return { success: false, message: authCheck.message };
    }

    const now = new Date();
    await prisma.userTutorialProgress.upsert({
      where: {
        userId_role: {
          userId: authCheck.user.id,
          role: authCheck.role,
        },
      },
      create: {
        id: uuid(),
        userId: authCheck.user.id,
        role: authCheck.role,
        status,
        completedAt: status === "COMPLETED" ? now : null,
        cancelledAt: status === "CANCELLED" ? now : null,
      },
      update: {
        status,
        completedAt: status === "COMPLETED" ? now : null,
        cancelledAt: status === "CANCELLED" ? now : null,
      },
    });

    return { success: true, message: "Tutorial progress saved." };
  } catch (error) {
    console.error("Tutorial progress save failed:", error);
    return {
      success: false,
      message:
        (error as Error).message || "Failed to save tutorial progress.",
    };
  }
}
