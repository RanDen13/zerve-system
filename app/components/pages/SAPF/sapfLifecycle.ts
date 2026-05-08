export const SAPF_OPERATIONAL_STATUSES = [
  "NOT_STARTED",
  "WAITING_FOR_EVENT",
  "EQUIPMENT_PENDING",
  "EQUIPMENT_PROVIDED",
  "ONGOING",
  "AWAITING_EQUIPMENT_RETURN",
  "RETURN_REQUESTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type SapfOperationalStatus =
  (typeof SAPF_OPERATIONAL_STATUSES)[number];

const statusLabels: Record<SapfOperationalStatus, string> = {
  NOT_STARTED: "Not started",
  WAITING_FOR_EVENT: "Waiting for event",
  EQUIPMENT_PENDING: "Equipment pending",
  EQUIPMENT_PROVIDED: "Equipment ready",
  ONGOING: "Ongoing",
  AWAITING_EQUIPMENT_RETURN: "Awaiting return",
  RETURN_REQUESTED: "Return requested",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function operationalStatusLabel(status?: string | null) {
  const normalized = normalizeOperationalStatus(status);
  return statusLabels[normalized];
}

export function normalizeOperationalStatus(
  status?: string | null,
): SapfOperationalStatus {
  return SAPF_OPERATIONAL_STATUSES.includes(status as SapfOperationalStatus)
    ? (status as SapfOperationalStatus)
    : "NOT_STARTED";
}

export function firstScheduleStart(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  const first = schedules[0]?.startAt;
  return first ? new Date(first) : null;
}

export function lastScheduleEnd(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  const last = schedules[schedules.length - 1]?.endAt;
  return last ? new Date(last) : null;
}

export function hasSapfEventStarted(request: any, now = new Date()) {
  const start = firstScheduleStart(request);
  return Boolean(start && now >= start);
}

export function hasSapfEventEnded(request: any, now = new Date()) {
  const end = lastScheduleEnd(request);
  return Boolean(end && now >= end);
}

export function isSapfEquipmentReleaseWindowOpen(
  request: any,
  now = new Date(),
) {
  const start = firstScheduleStart(request);
  if (!start) return false;
  const releaseWindowStart = new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000);
  return now >= releaseWindowStart;
}

export function deriveSapfOperationalStatus(
  request: any,
  now = new Date(),
): SapfOperationalStatus {
  if (request?.status === "CANCELLED") return "CANCELLED";
  if (request?.status !== "APPROVED") return "NOT_STARTED";

  if (
    !Array.isArray(request?.equipmentRequests) &&
    request?.operationalStatus
  ) {
    return normalizeOperationalStatus(request.operationalStatus);
  }

  const equipmentRows = Array.isArray(request?.equipmentRequests)
    ? request.equipmentRequests
    : [];
  const hasEquipment = equipmentRows.length > 0;
  const allReturned =
    hasEquipment && equipmentRows.every((row: any) => row.status === "RETURNED");
  const anyReturnRequested = equipmentRows.some(
    (row: any) => row.status === "RETURN_REQUESTED",
  );
  const anyProvided = equipmentRows.some((row: any) => row.status === "PROVIDED");
  const anyRequested = equipmentRows.some(
    (row: any) => row.status === "REQUESTED",
  );
  const eventStarted = hasSapfEventStarted(request, now);
  const eventEnded = hasSapfEventEnded(request, now);
  const releaseWindowOpen = isSapfEquipmentReleaseWindowOpen(request, now);

  if (hasEquipment && allReturned) return "COMPLETED";
  if (!hasEquipment && eventEnded) return "COMPLETED";
  if (anyReturnRequested) return "RETURN_REQUESTED";
  if (eventEnded && anyProvided) return "AWAITING_EQUIPMENT_RETURN";
  if (eventStarted && !eventEnded) return "ONGOING";
  if (anyProvided) return "EQUIPMENT_PROVIDED";
  if (hasEquipment && anyRequested && releaseWindowOpen) {
    return "EQUIPMENT_PENDING";
  }

  return "WAITING_FOR_EVENT";
}

export function isSapfOperationallyComplete(request: any) {
  return deriveSapfOperationalStatus(request) === "COMPLETED";
}
