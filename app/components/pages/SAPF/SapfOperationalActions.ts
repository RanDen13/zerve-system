"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveSapfOperationalStatus } from "./sapfLifecycle";

type SapfDbClient = Prisma.TransactionClient | typeof prisma;

function operationalTimestampData(
  previousStatus: string | null | undefined,
  nextStatus: string,
  completedAt?: Date | null,
) {
  const changed = previousStatus !== nextStatus;
  return {
    operationalStatus: nextStatus as any,
    operationalStatusUpdatedAt: changed ? new Date() : undefined,
    completedAt:
      nextStatus === "COMPLETED" ? completedAt || new Date() : null,
  };
}

export async function syncSapfOperationalStatusById(
  requestId: string,
  db: SapfDbClient = prisma,
) {
  if (!requestId) return null;

  const request = await db.sAPFRequest.findUnique({
    where: { id: requestId },
    include: {
      schedules: { orderBy: { startAt: "asc" } },
      equipmentRequests: { select: { status: true } },
    },
  });
  if (!request) return null;

  const nextStatus = deriveSapfOperationalStatus(request);
  if (
    request.operationalStatus === nextStatus &&
    (nextStatus !== "COMPLETED" || request.completedAt)
  ) {
    return request;
  }

  return db.sAPFRequest.update({
    where: { id: request.id },
    data: operationalTimestampData(
      request.operationalStatus,
      nextStatus,
      request.completedAt,
    ),
  });
}

export async function syncSapfOperationalStatuses(options: {
  requestId?: string;
  take?: number;
} = {}) {
  const requests = await prisma.sAPFRequest.findMany({
    where: options.requestId
      ? { id: options.requestId }
      : { status: { in: ["APPROVED", "CANCELLED"] as any } },
    include: {
      schedules: { orderBy: { startAt: "asc" } },
      equipmentRequests: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: options.requestId ? undefined : options.take ?? 100,
  });

  await Promise.all(
    requests.map(async (request: any) => {
      const nextStatus = deriveSapfOperationalStatus(request);
      if (
        request.operationalStatus === nextStatus &&
        (nextStatus !== "COMPLETED" || request.completedAt)
      ) {
        return;
      }

      await prisma.sAPFRequest.update({
        where: { id: request.id },
        data: operationalTimestampData(
          request.operationalStatus,
          nextStatus,
          request.completedAt,
        ),
      });
    }),
  );
}
