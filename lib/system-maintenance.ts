import { prisma } from "@/lib/prisma";

export function canBypassSystemMaintenance(role?: string | null) {
  return ["ADMIN", "SUPER_ADMIN"].includes(role?.toUpperCase() || "");
}

export async function getActiveSystemMaintenance(now = new Date()) {
  return prisma.venueBlock.findFirst({
    where: {
      type: "SYSTEM_MAINTENANCE" as any,
      eventSpaceId: null,
      schedules: {
        some: {
          startAt: { lte: now },
          endAt: { gte: now },
        },
      },
    },
    select: {
      id: true,
      title: true,
      reason: true,
      schedules: {
        where: {
          startAt: { lte: now },
          endAt: { gte: now },
        },
        select: {
          startAt: true,
          endAt: true,
        },
        orderBy: { startAt: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isSystemMaintenanceActive() {
  return Boolean(await getActiveSystemMaintenance());
}
