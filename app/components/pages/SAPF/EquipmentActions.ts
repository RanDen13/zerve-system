"use server";

import ActionResult from "@/app/components/ActionResult";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import {
  EQUIPMENT_SUPPORT_FIELDS,
  EQUIPMENT_SUPPORT_LABELS,
  normalizeSupportRequestLabel,
  parseEquipmentQuantity,
} from "./sapfEquipment";
import {
  syncSapfOperationalStatusById,
  syncSapfOperationalStatuses,
} from "./SapfOperationalActions";
import {
  formatSapfDateForMessage,
  formatSapfTime,
} from "./sapfSchedule";

const equipmentRoles = ["EQUIPMENT_PROVISIONER", "ADMIN", "SUPER_ADMIN"];
const provisionerNotificationRoles = ["EQUIPMENT_PROVISIONER"];
const equipmentBusyStatuses = ["REQUESTED", "PROVIDED", "RETURN_REQUESTED"];
const equipmentRequestStatuses = [
  "SUBMITTED",
  "IN_REVIEW",
  "RETURNED_FOR_REVISION",
  "APPROVED",
];
const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000";

type ScheduleRange = {
  startAt: Date;
  endAt: Date;
};

type SapfEquipmentSelection = {
  supportLabel: string;
  quantityField: string;
  quantity: number;
};

function absoluteUrl(path: string) {
  return new URL(path, appUrl).toString();
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

function normalizeRole(role?: string | null) {
  return role?.toUpperCase() || "";
}

function canManageEquipment(role?: string | null) {
  return equipmentRoles.includes(normalizeRole(role));
}

function hasOverlap(
  startAt: Date,
  endAt: Date,
  candidateStart: Date,
  candidateEnd: Date,
) {
  return candidateStart < endAt && candidateEnd > startAt;
}

function rangesOverlap(slots: ScheduleRange[], ranges: ScheduleRange[]) {
  if (slots.length === 0) return false;
  return slots.some((slot) =>
    ranges.some((range) =>
      hasOverlap(slot.startAt, slot.endAt, range.startAt, range.endAt),
    ),
  );
}

function formatSchedule(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  if (!schedules.length) return "No schedule";

  return schedules
    .map(
      (schedule: any) =>
        `${formatSapfDateForMessage(schedule.startAt)} ${formatSapfTime(
          schedule.startAt,
        )}-${formatSapfTime(schedule.endAt)}`,
    )
    .join(", ");
}

function formatScheduleHtml(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  if (!schedules.length) return "No schedule";

  return schedules
    .map(
      (schedule: any) =>
        `${escapeHtml(formatSapfDateForMessage(schedule.startAt))} ${escapeHtml(
          formatSapfTime(schedule.startAt),
        )}-${escapeHtml(formatSapfTime(schedule.endAt))}`,
    )
    .join("<br />");
}

function firstScheduleStart(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  const first = schedules[0]?.startAt;
  return first ? new Date(first) : null;
}

function lastScheduleEnd(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  const last = schedules[schedules.length - 1]?.endAt;
  return last ? new Date(last) : null;
}

function canReleaseEquipmentNow(request: any, now = new Date()) {
  const start = firstScheduleStart(request);
  if (!start) return false;
  const releaseWindowStart = new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000);
  return now >= releaseWindowStart;
}

function hasEventEnded(request: any, now = new Date()) {
  const end = lastScheduleEnd(request);
  return Boolean(end && now >= end);
}

function equipmentSummary(rows: any[]) {
  if (!rows.length) return "No equipment";
  return rows
    .map((row) => `${row.equipmentItem?.name || "Equipment"} x ${row.quantity}`)
    .join(", ");
}

function equipmentRowsHtml(rows: any[]) {
  if (!rows.length) return "<p style=\"margin:0;color:#64748b;font-size:14px;\">No equipment listed.</p>";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
    ${rows
      .map(
        (row, index) => `
    <tr>
      <td style="padding:13px 16px;background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:750;">${escapeHtml(row.equipmentItem?.name || "Equipment")}</td>
      <td align="right" style="padding:13px 16px;background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};border-bottom:1px solid #e5e7eb;color:#2563eb;font-size:14px;font-weight:850;">x ${escapeHtml(row.quantity)}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

async function syncEquipmentAmenity({
  name,
  supportLabel,
  active,
}: {
  name: string;
  supportLabel: string | null;
  active: boolean;
}) {
  if (!supportLabel) return;

  const existing = await prisma.amenity.findFirst({
    where: {
      OR: [{ supportLabel }, { name }],
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.amenity.update({
      where: { id: existing.id },
      data: {
        name,
        supportLabel,
        active,
        icon: supportLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      },
    });
    return;
  }

  await prisma.amenity.create({
    data: {
      id: uuid(),
      name,
      supportLabel,
      active,
      icon: supportLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    },
  });
}

function userDisplayName(user: { name?: string | null; email?: string | null }) {
  return user.name || user.email || "A user";
}

function supportLabelLookupValues(label: string) {
  const normalized = normalizeSupportRequestLabel(label);
  return normalized === "Tables"
    ? ["Tables", "One Long Table", "Long Table"]
    : [normalized];
}

async function validateEquipmentItemUniqueness({
  itemId,
  name,
  supportLabel,
}: {
  itemId?: string;
  name: string;
  supportLabel: string | null;
}) {
  const [nameMatch, supportLabelMatch] = await Promise.all([
    (prisma as any).equipmentItem.findFirst({
      where: {
        name,
        ...(itemId ? { id: { not: itemId } } : {}),
      },
      select: { id: true },
    }),
    supportLabel
      ? (prisma as any).equipmentItem.findFirst({
          where: {
            supportLabel,
            ...(itemId ? { id: { not: itemId } } : {}),
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (nameMatch) {
    return {
      success: false,
      message: "An equipment item with that name already exists.",
    } satisfies ActionResult<void>;
  }

  if (supportLabelMatch) {
    return {
      success: false,
      message: `${supportLabel} is already mapped to another equipment item.`,
    } satisfies ActionResult<void>;
  }

  return null;
}

async function createNotification(
  userId: string,
  title: string,
  body: string,
  requestId?: string,
) {
  await prisma.notification.create({
    data: {
      id: uuid(),
      userId,
      title,
      body,
      type: "EQUIPMENT" as any,
      requestId,
    },
  });
}

async function logSapfActivity(
  db: any,
  {
    requestId,
    actorId,
    action,
    title,
    description,
    metadata,
  }: {
    requestId: string;
    actorId?: string | null;
    action: string;
    title: string;
    description?: string | null;
    metadata?: Record<string, any> | null;
  },
) {
  await db.sAPFActivityLog.create({
    data: {
      id: uuid(),
      requestId,
      actorId: actorId || null,
      action,
      title,
      description: description || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

function sapfEquipmentSelections(sapf: any): SapfEquipmentSelection[] {
  const selected = new Set<string>(
    (sapf?.supportRequests || []).map((value: string) =>
      normalizeSupportRequestLabel(value),
    ),
  );

  return EQUIPMENT_SUPPORT_FIELDS.filter((field) =>
    selected.has(field.supportLabel),
  ).map((field) => ({
    supportLabel: field.supportLabel,
    quantityField: field.quantityField,
    quantity: parseEquipmentQuantity(sapf?.[field.quantityField]),
  }));
}

async function getEquipmentProvisioners() {
  return prisma.user.findMany({
    where: {
      role: { in: provisionerNotificationRoles },
      banned: { not: true },
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailNotificationsEnabled: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function sendEquipmentEmail({
  to,
  subject,
  message,
  request,
  equipmentRows,
  linkPath = "/user/equipment",
}: {
  to: string;
  subject: string;
  message: string;
  request: any;
  equipmentRows: any[];
  linkPath?: string;
}) {
  const link = absoluteUrl(linkPath);
  const text = [
    message,
    "",
    `Request: ${request.requestNumber} - ${request.title}`,
    `Officer: ${request.officer?.name || "Unknown"}`,
    `Schedule: ${formatSchedule(request)}`,
    `Equipment: ${equipmentSummary(equipmentRows)}`,
    "",
    link,
  ].join("\n");
  const html = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#eef2f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(message)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.14);">
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,#064e3b 0%,#0f766e 45%,#2563eb 100%);">
                <div style="padding:28px 32px 44px;">
                  <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#d1fae5;font-weight:800;">UniSpace Equipment Desk</div>
                  <h1 style="margin:18px 0 0;color:#ffffff;font-size:30px;line-height:1.18;font-weight:850;">Equipment update</h1>
                  <p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.65;">${escapeHtml(message)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="margin-top:14px;display:inline-block;background:#2563eb;color:#ffffff;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 10px 24px rgba(15,23,42,.18);">Equipment</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 8px;">
                <div style="font-size:12px;font-weight:850;letter-spacing:.16em;text-transform:uppercase;color:#64748b;">Booking Details</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="width:34%;padding:15px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Request</td>
                    <td style="padding:15px 18px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:1.55;font-weight:650;">${escapeHtml(request.requestNumber)} - ${escapeHtml(request.title)}</td>
                  </tr>
                  <tr>
                    <td style="width:34%;padding:15px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Officer</td>
                    <td style="padding:15px 18px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:1.55;font-weight:650;">${escapeHtml(request.officer?.name || "Unknown")}</td>
                  </tr>
                  <tr>
                    <td style="width:34%;padding:15px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Schedule</td>
                    <td style="padding:15px 18px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:1.55;font-weight:650;">${formatScheduleHtml(request)}</td>
                  </tr>
                </table>
                <div style="margin-top:18px;font-size:12px;font-weight:850;letter-spacing:.16em;text-transform:uppercase;color:#64748b;">Equipment</div>
                <div style="margin-top:12px;">${equipmentRowsHtml(equipmentRows)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 34px;">
                <a href="${escapeHtml(link)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:850;">Open in UniSpace</a>
                <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.55;">This is an automated equipment notification from UniSpace. Please do not reply directly to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendEmail(to, subject, text, { html });
}

async function equipmentRowsForRequest(requestId: string) {
  return (prisma as any).sAPFEquipmentRequest.findMany({
    where: {
      requestId,
      quantity: { gt: 0 },
    },
    include: {
      equipmentItem: true,
      request: {
        include: {
          officer: true,
          schedules: { orderBy: { startAt: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function usedQuantitiesByItem({
  itemIds,
  slots,
  excludeRequestId,
  db = prisma,
}: {
  itemIds: string[];
  slots: ScheduleRange[];
  excludeRequestId?: string;
  db?: any;
}) {
  const used = new Map<string, number>();
  if (!itemIds.length || !slots.length) return used;

  const allocations = await (db as any).sAPFEquipmentRequest.findMany({
    where: {
      equipmentItemId: { in: itemIds },
      requestId: excludeRequestId ? { not: excludeRequestId } : undefined,
      status: { in: equipmentBusyStatuses as any },
      request: {
        status: { in: equipmentRequestStatuses as any },
      },
    },
    include: {
      request: {
        select: {
          schedules: {
            select: { startAt: true, endAt: true },
          },
        },
      },
    },
  });

  for (const allocation of allocations) {
    const ranges = allocation.request.schedules.map((schedule: any) => ({
      startAt: schedule.startAt,
      endAt: schedule.endAt,
    }));
    if (!rangesOverlap(slots, ranges)) continue;
    used.set(
      allocation.equipmentItemId,
      (used.get(allocation.equipmentItemId) || 0) + allocation.quantity,
    );
  }

  return used;
}

export async function lockSapfEquipmentForTransaction(tx: any, sapf: any) {
  const selections = sapfEquipmentSelections(sapf);
  if (selections.length === 0) return;

  const items = await tx.equipmentItem.findMany({
    where: {
      supportLabel: {
        in: selections.flatMap((item) =>
          supportLabelLookupValues(item.supportLabel),
        ),
      },
    },
    select: { id: true },
  });

  for (const item of items.map((item: any) => item.id).sort()) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`sapf-equipment:${item}`}))
    `;
  }
}

export async function validateSapfEquipmentAvailability({
  sapf,
  scheduleSlots,
  excludeRequestId,
  db = prisma,
}: {
  sapf: any;
  scheduleSlots: ScheduleRange[];
  excludeRequestId?: string;
  db?: any;
}) {
  const selections = sapfEquipmentSelections(sapf);
  if (selections.length === 0) return;

  const items = await (db as any).equipmentItem.findMany({
    where: {
      supportLabel: {
        in: selections.flatMap((item) =>
          supportLabelLookupValues(item.supportLabel),
        ),
      },
    },
  });
  const itemBySupport = new Map<string, any>(
    items.map((item: any) => [
      normalizeSupportRequestLabel(item.supportLabel || ""),
      item,
    ]),
  );
  const used = await usedQuantitiesByItem({
    itemIds: items.map((item: any) => item.id),
    slots: scheduleSlots,
    excludeRequestId,
    db,
  });

  for (const selection of selections) {
    const item = itemBySupport.get(selection.supportLabel);
    if (!item || !item.active || item.totalQuantity <= 0) {
      throw new Error(`${selection.supportLabel} is not available right now.`);
    }
    if (selection.quantity <= 0) {
      throw new Error(`Enter a quantity for ${selection.supportLabel}.`);
    }

    const available = Math.max(
      0,
      item.totalQuantity - (used.get(item.id) || 0),
    );
    if (selection.quantity > available) {
      throw new Error(
        `${selection.supportLabel} has only ${available} available for the selected schedule.`,
      );
    }
  }
}

export async function replaceSapfEquipmentRequests(
  tx: any,
  requestId: string,
  sapf: any,
) {
  const selections = sapfEquipmentSelections(sapf);
  const supportLabels = selections.map((item) => item.supportLabel);
  const items = supportLabels.length
    ? await tx.equipmentItem.findMany({
        where: {
          supportLabel: {
            in: supportLabels.flatMap((label) => supportLabelLookupValues(label)),
          },
        },
      })
    : [];
  const itemBySupport = new Map<string, any>(
    items.map((item: any) => [
      normalizeSupportRequestLabel(item.supportLabel || ""),
      item,
    ]),
  );
  const selectedItemIds = items.map((item: any) => item.id);

  if (selectedItemIds.length === 0) {
    await tx.sAPFEquipmentRequest.deleteMany({ where: { requestId } });
    return;
  }

  await tx.sAPFEquipmentRequest.deleteMany({
    where: {
      requestId,
      equipmentItemId: { notIn: selectedItemIds },
    },
  });

  for (const selection of selections) {
    const item = itemBySupport.get(selection.supportLabel);
    if (!item) continue;

    await tx.sAPFEquipmentRequest.upsert({
      where: {
        requestId_equipmentItemId: {
          requestId,
          equipmentItemId: item.id,
        },
      },
      create: {
        id: uuid(),
        requestId,
        equipmentItemId: item.id,
        quantity: selection.quantity,
        status: "REQUESTED" as any,
      },
      update: {
        quantity: selection.quantity,
        status: "REQUESTED" as any,
        providedAt: null,
        providedById: null,
        returnRequestedAt: null,
        returnedAt: null,
        returnedById: null,
      },
    });
  }
}

export async function getEquipmentCatalogForBooking(
  excludeRequestId?: string,
): Promise<ActionResult<any>> {
  try {
    const user = await getSessionUser();
    if (!user) return { success: false, message: "Unauthorized access." };

    const [items, allocations] = await Promise.all([
      (prisma as any).equipmentItem.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
      (prisma as any).sAPFEquipmentRequest.findMany({
        where: {
          requestId: excludeRequestId ? { not: excludeRequestId } : undefined,
          status: { in: equipmentBusyStatuses as any },
          request: {
            status: { in: equipmentRequestStatuses as any },
          },
        },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              title: true,
              schedules: {
                select: { startAt: true, endAt: true },
                orderBy: { startAt: "asc" },
              },
            },
          },
        },
      }),
    ]);

    const allocationsByItem = allocations.reduce((acc: any, item: any) => {
      acc[item.equipmentItemId] = acc[item.equipmentItemId] || [];
      acc[item.equipmentItemId].push({
        requestId: item.requestId,
        requestNumber: item.request?.requestNumber,
        title: item.request?.title,
        quantity: item.quantity,
        status: item.status,
        schedules: item.request?.schedules || [],
      });
      return acc;
    }, {});

    return {
      success: true,
      data: jsonSafe(
        items.map((item: any) => ({
          ...item,
          allocations: allocationsByItem[item.id] || [],
        })),
      ),
    };
  } catch (error) {
    console.error("Equipment catalog load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load equipment.",
    };
  }
}

export async function getEquipmentWorkspace(): Promise<ActionResult<any>> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageEquipment(user.role)) {
      return {
        success: false,
        message: "Only equipment provisioners can manage equipment.",
      };
    }

    try {
      await syncSapfOperationalStatuses();
      await sendEquipmentDueReminders();
    } catch (error) {
      console.error("Equipment reminder check failed:", error);
    }

    const [items, requests] = await Promise.all([
      (prisma as any).equipmentItem.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
      (prisma as any).sAPFEquipmentRequest.findMany({
        where: {
          request: {
            status: { in: equipmentRequestStatuses as any },
          },
        },
        include: {
          equipmentItem: true,
          providedBy: { select: { id: true, name: true, email: true } },
          returnedBy: { select: { id: true, name: true, email: true } },
          request: {
            include: {
              officer: { select: { id: true, name: true, email: true } },
              venues: {
                include: {
                  eventSpace: { select: { id: true, name: true } },
                },
              },
              schedules: {
                select: { id: true, startAt: true, endAt: true },
                orderBy: { startAt: "asc" },
              },
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      }),
    ]);

    return {
      success: true,
      data: jsonSafe({
        me: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.role),
        },
        items,
        requests,
      }),
    };
  } catch (error) {
    console.error("Equipment workspace load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load equipment workspace.",
    };
  }
}

export async function createDefaultEquipmentItems(): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageEquipment(user.role)) {
      return {
        success: false,
        message: "Only equipment provisioners can create equipment.",
      };
    }

    for (const field of EQUIPMENT_SUPPORT_FIELDS) {
      const existing = await (prisma as any).equipmentItem.findFirst({
        where: {
          OR: [
            { supportLabel: field.supportLabel },
            field.supportLabel === "Tables"
              ? { supportLabel: "One Long Table" }
              : undefined,
            { name: field.defaultName },
            field.supportLabel === "Tables" ? { name: "Long Table" } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (existing) {
        await (prisma as any).equipmentItem.update({
          where: { id: existing.id },
          data: {
            name: field.defaultName,
            supportLabel: field.supportLabel,
            active: true,
          },
        });
        await syncEquipmentAmenity({
          name: field.defaultName,
          supportLabel: field.supportLabel,
          active: true,
        });
      } else {
        await (prisma as any).equipmentItem.create({
          data: {
            id: uuid(),
            name: field.defaultName,
            supportLabel: field.supportLabel,
            totalQuantity: 0,
            active: true,
            createdById: user.id,
          },
        });
        await syncEquipmentAmenity({
          name: field.defaultName,
          supportLabel: field.supportLabel,
          active: true,
        });
      }
    }

    revalidatePath("/user/equipment");
    revalidatePath("/user/bookings/create");
    return { success: true, message: "Default equipment added." };
  } catch (error) {
    console.error("Default equipment create failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to add default equipment.",
    };
  }
}

export async function saveEquipmentItem(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageEquipment(user.role)) {
      return {
        success: false,
        message: "Only equipment provisioners can update equipment.",
      };
    }

    const itemId = String(data.get("itemId") || "").trim();
    const name = String(data.get("name") || "").trim();
    const supportLabelInput = String(data.get("supportLabel") || "").trim();
    const totalQuantity = Number.parseInt(
      String(data.get("totalQuantity") || "0"),
      10,
    );
    const active = data.get("active") !== "false";
    const normalizedSupportLabel = normalizeSupportRequestLabel(supportLabelInput);
    const supportLabel =
      supportLabelInput &&
      supportLabelInput !== "NONE" &&
      EQUIPMENT_SUPPORT_LABELS.includes(normalizedSupportLabel as any)
        ? normalizedSupportLabel
        : null;

    if (!name) return { success: false, message: "Equipment name is required." };
    if (!Number.isFinite(totalQuantity) || totalQuantity < 0) {
      return { success: false, message: "Quantity must be 0 or higher." };
    }

    const uniquenessError = await validateEquipmentItemUniqueness({
      itemId: itemId || undefined,
      name,
      supportLabel,
    });
    if (uniquenessError) return uniquenessError;

    if (itemId) {
      await (prisma as any).equipmentItem.update({
        where: { id: itemId },
        data: { name, supportLabel, totalQuantity, active },
      });
    } else {
      await (prisma as any).equipmentItem.create({
        data: {
          id: uuid(),
          name,
          supportLabel,
          totalQuantity,
          active,
          createdById: user.id,
        },
      });
    }
    await syncEquipmentAmenity({ name, supportLabel, active });

    revalidatePath("/user/equipment");
    revalidatePath("/user/dashboard");
    revalidatePath("/user/bookings/create");
    revalidatePath("/user/spaces");
    return { success: true, message: "Equipment saved." };
  } catch (error) {
    console.error("Equipment save failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to save equipment.",
    };
  }
}

export async function markEquipmentProvided(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageEquipment(user.role)) {
      return {
        success: false,
        message: "Only equipment provisioners can mark equipment provided.",
      };
    }

    const requestId = String(data.get("requestId") || "").trim();
    const rows = await equipmentRowsForRequest(requestId);
    if (!rows.length) {
      return { success: false, message: "No equipment request found." };
    }

    const request = rows[0].request;
    const pendingRows = rows.filter((row: any) => row.status === "REQUESTED");
    if (!pendingRows.length) {
      return { success: false, message: "No pending equipment to provide." };
    }
    if (request.status !== "APPROVED") {
      return {
        success: false,
        message: "Equipment can only be released after the booking is fully approved.",
      };
    }
    if (!canReleaseEquipmentNow(request)) {
      return {
        success: false,
        message:
          "Equipment can be released starting 3 days before the event schedule.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sAPFEquipmentRequest.updateMany({
        where: { requestId, status: "REQUESTED" as any },
        data: {
          status: "PROVIDED" as any,
          providedAt: new Date(),
          providedById: user.id,
        },
      });
      await logSapfActivity(tx, {
        requestId,
        actorId: user.id,
        action: "EQUIPMENT_PROVIDED",
        title: "Equipment provided",
        description: `${userDisplayName(user)} marked requested equipment as provided.`,
        metadata: {
          equipment: pendingRows.map((row: any) => ({
            name: row.equipmentItem?.name,
            quantity: row.quantity,
          })),
        },
      });
    });
    await syncSapfOperationalStatusById(request.id);

    await createNotification(
      request.officerId,
      "Equipment provided",
      `${request.requestNumber} equipment was marked as provided.`,
      request.id,
    );
    if (request.officer?.email && request.officer.emailNotificationsEnabled !== false) {
      await sendEquipmentEmail({
        to: request.officer.email,
        subject: `[UniSpace] Equipment provided for ${request.requestNumber}`,
        message: "Requested equipment was marked as provided.",
        request,
        equipmentRows: rows,
        linkPath: `/user/bookings/${request.id}`,
      });
    }

    revalidatePath("/user/equipment");
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/bookings/${request.id}`);
    return { success: true, message: "Equipment marked as provided." };
  } catch (error) {
    console.error("Mark equipment provided failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to mark equipment provided.",
    };
  }
}

export async function requestEquipmentReturn(
  requestId: string,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || normalizeRole(user.role) !== "OFFICER") {
      return {
        success: false,
        message: "Only the booking officer can request equipment return.",
      };
    }

    const request = await prisma.sAPFRequest.findFirst({
      where: {
        id: requestId,
        officerId: user.id,
        status: "APPROVED" as any,
      },
      include: {
        officer: true,
        schedules: { orderBy: { startAt: "asc" } },
        equipmentRequests: {
          where: { status: "PROVIDED" as any },
          include: { equipmentItem: true },
        },
      },
    });

    if (!request) {
      return {
        success: false,
        message: "Approved booking with provided equipment was not found.",
      };
    }
    if (!request.equipmentRequests.length) {
      return {
        success: false,
        message: "No provided equipment is ready for return.",
      };
    }
    if (!hasEventEnded(request)) {
      return {
        success: false,
        message: "Equipment return can only be requested after the event ends.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sAPFEquipmentRequest.updateMany({
        where: { requestId, status: "PROVIDED" as any },
        data: {
          status: "RETURN_REQUESTED" as any,
          returnRequestedAt: new Date(),
        },
      });
      await logSapfActivity(tx, {
        requestId,
        actorId: user.id,
        action: "EQUIPMENT_RETURN_REQUESTED",
        title: "Equipment return requested",
        description: `${userDisplayName(user)} marked the event done and requested equipment pickup.`,
        metadata: {
          equipment: request.equipmentRequests.map((row: any) => ({
            name: row.equipmentItem?.name,
            quantity: row.quantity,
          })),
        },
      });
    });

    await syncSapfOperationalStatusById(request.id);
    await notifyProvisionersForEquipmentReturn(request.id);
    revalidatePath(`/user/bookings/${request.id}`);
    revalidatePath("/user/dashboard");
    revalidatePath("/user/equipment");
    return { success: true, message: "Equipment return requested." };
  } catch (error) {
    console.error("Request equipment return failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to request return.",
    };
  }
}

export async function confirmEquipmentReturned(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageEquipment(user.role)) {
      return {
        success: false,
        message: "Only equipment provisioners can confirm returns.",
      };
    }

    const requestId = String(data.get("requestId") || "").trim();
    const rows = await equipmentRowsForRequest(requestId);
    const request = rows[0]?.request;
    const returnRows = rows.filter(
      (row: any) => row.status === "RETURN_REQUESTED",
    );
    if (!request || !returnRows.length) {
      return { success: false, message: "No equipment return is pending." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sAPFEquipmentRequest.updateMany({
        where: { requestId, status: "RETURN_REQUESTED" as any },
        data: {
          status: "RETURNED" as any,
          returnedAt: new Date(),
          returnedById: user.id,
        },
      });
      await logSapfActivity(tx, {
        requestId,
        actorId: user.id,
        action: "EQUIPMENT_RETURNED",
        title: "Equipment returned",
        description: `${userDisplayName(user)} confirmed equipment was returned to inventory.`,
        metadata: {
          equipment: returnRows.map((row: any) => ({
            name: row.equipmentItem?.name,
            quantity: row.quantity,
          })),
        },
      });
    });

    await syncSapfOperationalStatusById(request.id);
    await createNotification(
      request.officerId,
      "Equipment returned",
      `${request.requestNumber} equipment was confirmed returned.`,
      request.id,
    );
    if (request.officer?.email && request.officer.emailNotificationsEnabled !== false) {
      await sendEquipmentEmail({
        to: request.officer.email,
        subject: `[UniSpace] Equipment returned for ${request.requestNumber}`,
        message: "Your requested equipment was confirmed returned.",
        request,
        equipmentRows: rows,
        linkPath: `/user/bookings/${request.id}`,
      });
    }
    revalidatePath("/user/equipment");
    revalidatePath("/user/dashboard");
    revalidatePath(`/user/bookings/${request.id}`);
    return { success: true, message: "Equipment returned to inventory." };
  } catch (error) {
    console.error("Confirm equipment return failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to confirm return.",
    };
  }
}

export async function notifyProvisionersForEquipmentRequest(
  requestId: string,
  context: "submitted" | "approved" = "submitted",
) {
  const rows = await equipmentRowsForRequest(requestId);
  if (!rows.length) return;

  const request = rows[0].request;
  const provisioners = await getEquipmentProvisioners();
  if (!provisioners.length) return;

  const title =
    context === "approved"
      ? "Approved booking needs equipment"
      : "Booking needs equipment";
  const body = `${request.requestNumber} needs ${equipmentSummary(rows)}.`;

  await Promise.all(
    provisioners.map(async (provisioner) => {
      await createNotification(provisioner.id, title, body, request.id);
      if (provisioner.email && provisioner.emailNotificationsEnabled !== false) {
        await sendEquipmentEmail({
          to: provisioner.email,
          subject: `[UniSpace] ${request.requestNumber} needs equipment`,
          message: body,
          request,
          equipmentRows: rows,
        });
      }
    }),
  );
}

export async function notifyOfficerEquipmentStatusOnApproval(requestId: string) {
  const rows = await equipmentRowsForRequest(requestId);
  if (!rows.length) return;

  const request = rows[0].request;
  await createNotification(
    request.officerId,
    "Equipment pending provision",
    `${request.requestNumber} is approved. Equipment provision status: not yet provided.`,
    request.id,
  );
  if (request.officer?.email && request.officer.emailNotificationsEnabled !== false) {
    await sendEquipmentEmail({
      to: request.officer.email,
      subject: `[UniSpace] Equipment pending for ${request.requestNumber}`,
      message:
        "Your reservation is approved. Requested equipment is still pending provision.",
      request,
      equipmentRows: rows,
      linkPath: `/user/bookings/${request.id}`,
    });
  }
}

export async function notifyProvisionersForEquipmentReturn(requestId: string) {
  const rows = await equipmentRowsForRequest(requestId);
  if (!rows.length) return;

  const request = rows[0].request;
  const provisioners = await getEquipmentProvisioners();
  const body = `${request.requestNumber} is done. Please pick up and confirm returned equipment: ${equipmentSummary(rows)}.`;

  await Promise.all(
    provisioners.map(async (provisioner) => {
      await createNotification(
        provisioner.id,
        "Equipment return requested",
        body,
        request.id,
      );
      if (provisioner.email && provisioner.emailNotificationsEnabled !== false) {
        await sendEquipmentEmail({
          to: provisioner.email,
          subject: `[UniSpace] Equipment return requested for ${request.requestNumber}`,
          message: body,
          request,
          equipmentRows: rows,
        });
      }
    }),
  );
}

export async function sendEquipmentDueReminders() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const rows = await (prisma as any).sAPFEquipmentRequest.findMany({
    where: {
      status: "REQUESTED" as any,
      dueReminderSentAt: null,
      request: {
        status: "APPROVED" as any,
        schedules: {
          some: {
            startAt: {
              gte: now,
              lte: threeDaysFromNow,
            },
          },
        },
      },
    },
    include: {
      equipmentItem: true,
      request: {
        include: {
          officer: true,
          schedules: { orderBy: { startAt: "asc" } },
        },
      },
    },
  });

  const requestIds = [...new Set(rows.map((row: any) => row.requestId))];
  for (const requestId of requestIds) {
    const requestRows = rows.filter((row: any) => row.requestId === requestId);
    const request = requestRows[0].request;
    const body = `${request.requestNumber} starts within 3 days and equipment is not yet provided: ${equipmentSummary(requestRows)}.`;
    const provisioners = await getEquipmentProvisioners();

    await Promise.all([
      ...provisioners.map(async (provisioner) => {
        await createNotification(
          provisioner.id,
          "Equipment due soon",
          body,
          request.id,
        );
        if (provisioner.email && provisioner.emailNotificationsEnabled !== false) {
          await sendEquipmentEmail({
            to: provisioner.email,
            subject: `[UniSpace] Equipment due soon for ${request.requestNumber}`,
            message: body,
            request,
            equipmentRows: requestRows,
          });
        }
      }),
      createNotification(request.officerId, "Equipment not yet provided", body, request.id),
      request.officer?.email && request.officer.emailNotificationsEnabled !== false
        ? sendEquipmentEmail({
            to: request.officer.email,
            subject: `[UniSpace] Equipment not yet provided for ${request.requestNumber}`,
            message: body,
            request,
            equipmentRows: requestRows,
            linkPath: `/user/bookings/${request.id}`,
          })
        : Promise.resolve(),
      (prisma as any).sAPFEquipmentRequest.updateMany({
        where: { id: { in: requestRows.map((row: any) => row.id) } },
        data: { dueReminderSentAt: now },
      }),
    ]);
  }
}
