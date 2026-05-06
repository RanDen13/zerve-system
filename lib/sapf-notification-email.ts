import {
  formatSapfDateForMessage,
  formatSapfTime,
} from "@/app/components/pages/SAPF/sapfSchedule";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";

type WorkflowTone = "info" | "success" | "warning" | "danger";

type OfficerWorkflowEmail = {
  requestId: string;
  title: string;
  eyebrow: string;
  headline: string;
  message: string;
  statusLabel: string;
  tone: WorkflowTone;
  comment?: string | null;
  actorName?: string | null;
  actionLabel?: string;
};

type ApproverWorkflowEmail = {
  requestId: string;
  reviewerId: string;
  title?: string;
  eyebrow?: string;
  message?: string;
};

type SapfUpdateEmail = {
  requestId: string;
  actorName?: string | null;
  changes?: Array<{
    label?: string;
    field?: string;
    before?: string;
    after?: string;
  }>;
};

const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(path: string) {
  return new URL(path, appUrl).toString();
}

function toneColor(tone: WorkflowTone) {
  if (tone === "success") return "#047857";
  if (tone === "warning") return "#b45309";
  if (tone === "danger") return "#b91c1c";
  return "#2563eb";
}

function formatSchedule(request: any) {
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];
  if (!schedules.length) return "Schedule not set";

  return schedules
    .map(
      (schedule: any) =>
        `${formatSapfDateForMessage(schedule.startAt)} · ${formatSapfTime(
          schedule.startAt,
        )} - ${formatSapfTime(schedule.endAt)}`,
    )
    .join("<br />");
}

function venueText(request: any) {
  const fromRelations = (request.venues || [])
    .map((item: any) => item.eventSpace?.name)
    .filter(Boolean)
    .join(", ");

  return fromRelations || request.venue || "Venue not set";
}

async function getRequestForEmail(requestId: string) {
  return prisma.sAPFRequest.findUnique({
    where: { id: requestId },
    include: {
      officer: true,
      schedules: { orderBy: { startAt: "asc" } },
      venues: { include: { eventSpace: true } },
    },
  });
}

function canReceiveWorkflowEmail(user: any) {
  return Boolean(user?.email) && user.emailNotificationsEnabled !== false;
}

function emailLayout({
  preview,
  eyebrow,
  headline,
  message,
  badge,
  tone,
  rows,
  ctaHref,
  ctaLabel,
  comment,
}: {
  preview: string;
  eyebrow: string;
  headline: string;
  message: string;
  badge: string;
  tone: WorkflowTone;
  rows: Array<[string, string]>;
  ctaHref: string;
  ctaLabel: string;
  comment?: string | null;
}) {
  const color = toneColor(tone);
  const safePreview = escapeHtml(preview);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="margin:0;background:#eef2f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${safePreview}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.14);">
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,#064e3b 0%,#0f766e 45%,#2563eb 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:28px 32px 44px;">
                      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#d1fae5;font-weight:800;">Zerve Reservation System</div>
                      <h1 style="margin:18px 0 0;color:#ffffff;font-size:30px;line-height:1.18;font-weight:850;">${escapeHtml(headline)}</h1>
                      <p style="margin:14px 0 0;color:#dbeafe;font-size:15px;line-height:1.65;">${escapeHtml(message)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <div style="margin-top:14px;display:inline-block;background:${color};color:#ffffff;border-radius:999px;padding:10px 16px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 10px 24px rgba(15,23,42,.18);">${escapeHtml(badge)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 8px;">
                <div style="font-size:12px;font-weight:850;letter-spacing:.16em;text-transform:uppercase;color:#64748b;">${escapeHtml(eyebrow)}</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                  ${rows
                    .map(
                      ([label, value]) => `
                  <tr>
                    <td style="width:34%;padding:15px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</td>
                    <td style="padding:15px 18px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:1.55;font-weight:650;">${value}</td>
                  </tr>`,
                    )
                    .join("")}
                </table>
                ${
                  comment
                    ? `<div style="margin-top:18px;border-left:4px solid ${color};background:#f8fafc;border-radius:12px;padding:16px 18px;">
                        <div style="font-size:12px;font-weight:850;color:#475569;text-transform:uppercase;letter-spacing:.1em;">Reviewer Note</div>
                        <div style="margin-top:8px;color:#1f2937;font-size:14px;line-height:1.65;">${escapeHtml(comment)}</div>
                      </div>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 34px;">
                <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:850;">${escapeHtml(ctaLabel)}</a>
                <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.55;">This is an automated workflow notification from Zerve. Please do not reply directly to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendSapfWorkflowEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const sent = await sendEmail(to, subject, text, { html });
  if (!sent) {
    console.error(`SAPF workflow email was not accepted for ${to}.`);
  }
}

export async function notifyApproverForSapfReview({
  requestId,
  reviewerId,
  title = "Reservation request needs your review",
  eyebrow = "Approval action required",
  message = "A reservation request is now waiting for your review. Please open the request to approve, reject, or return it for revision.",
}: ApproverWorkflowEmail) {
  try {
    const [request, reviewer] = await Promise.all([
      getRequestForEmail(requestId),
      prisma.user.findUnique({ where: { id: reviewerId } }),
    ]);

    if (!request || !reviewer || !canReceiveWorkflowEmail(reviewer)) return;
    const reviewerEmail = reviewer.email;
    if (!reviewerEmail) return;

    const detailUrl = absoluteUrl(`/user/approvals/${request.id}`);
    const rows: Array<[string, string]> = [
      ["Request No.", escapeHtml(request.requestNumber)],
      ["Activity", escapeHtml(request.title)],
      ["Organization", escapeHtml(request.organization)],
      ["Venue", escapeHtml(venueText(request))],
      ["Schedule", formatSchedule(request)],
      ["Submitted By", escapeHtml(request.officer?.name || "Officer")],
    ];
    const subject = `[Zerve] ${request.requestNumber} needs your approval`;
    const html = emailLayout({
      preview: `${request.requestNumber} is ready for your approval.`,
      eyebrow,
      headline: title,
      message,
      badge: "Action Required",
      tone: "info",
      rows,
      ctaHref: detailUrl,
      ctaLabel: "Review Reservation",
    });
    const text = [
      title,
      "",
      message,
      "",
      `Request No: ${request.requestNumber}`,
      `Activity: ${request.title}`,
      `Organization: ${request.organization}`,
      `Venue: ${venueText(request)}`,
      `Review link: ${detailUrl}`,
    ].join("\n");

    await sendSapfWorkflowEmail({ to: reviewerEmail, subject, html, text });
  } catch (error) {
    console.error("Failed to send approver SAPF email:", error);
  }
}

export async function notifyOfficerForSapfWorkflow({
  requestId,
  title,
  eyebrow,
  headline,
  message,
  statusLabel,
  tone,
  comment,
  actorName,
  actionLabel = "View Reservation",
}: OfficerWorkflowEmail) {
  try {
    const request = await getRequestForEmail(requestId);
    if (!request || !canReceiveWorkflowEmail(request.officer)) return;
    const officerEmail = request.officer.email;
    if (!officerEmail) return;

    const detailUrl = absoluteUrl(`/user/bookings/${request.id}`);
    const rows: Array<[string, string]> = [
      ["Request No.", escapeHtml(request.requestNumber)],
      ["Activity", escapeHtml(request.title)],
      ["Organization", escapeHtml(request.organization)],
      ["Venue", escapeHtml(venueText(request))],
      ["Schedule", formatSchedule(request)],
      ["Handled By", escapeHtml(actorName || "Approver")],
    ];
    const subject = `[Zerve] ${request.requestNumber} ${title}`;
    const html = emailLayout({
      preview: `${request.requestNumber}: ${statusLabel}`,
      eyebrow,
      headline,
      message,
      badge: statusLabel,
      tone,
      rows,
      ctaHref: detailUrl,
      ctaLabel: actionLabel,
      comment,
    });
    const text = [
      headline,
      "",
      message,
      "",
      `Request No: ${request.requestNumber}`,
      `Activity: ${request.title}`,
      `Organization: ${request.organization}`,
      `Venue: ${venueText(request)}`,
      actorName ? `Handled by: ${actorName}` : "",
      comment ? `Note: ${comment}` : "",
      `Details: ${detailUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendSapfWorkflowEmail({
      to: officerEmail,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("Failed to send officer SAPF email:", error);
  }
}

function changesSummary(changes: SapfUpdateEmail["changes"]) {
  if (!changes?.length) return "The booking details were updated.";

  return changes
    .slice(0, 6)
    .map((change) => {
      const label = change.label || change.field || "Field";
      return `${label}: ${change.before || "Not set"} -> ${
        change.after || "Not set"
      }`;
    })
    .join("\n");
}

export async function notifySapfBookingUpdated({
  requestId,
  actorName,
  changes = [],
}: SapfUpdateEmail) {
  try {
    const request = await prisma.sAPFRequest.findUnique({
      where: { id: requestId },
      include: {
        officer: true,
        schedules: { orderBy: { startAt: "asc" } },
        venues: { include: { eventSpace: true } },
        approvalSteps: {
          include: { reviewer: true },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!request) return;

    const reviewerRecipients = request.approvalSteps
      .filter((step: any) => step.status === "APPROVED")
      .map((step: any) => step.reviewer)
      .filter(Boolean);
    const recipients = [request.officer, ...reviewerRecipients]
      .filter(canReceiveWorkflowEmail)
      .filter(
        (user, index, users) =>
          users.findIndex((candidate) => candidate.id === user.id) === index,
      );

    if (recipients.length === 0) return;

    const rows: Array<[string, string]> = [
      ["Request No.", escapeHtml(request.requestNumber)],
      ["Activity", escapeHtml(request.title)],
      ["Organization", escapeHtml(request.organization)],
      ["Venue", escapeHtml(venueText(request))],
      ["Schedule", formatSchedule(request)],
      ["Updated By", escapeHtml(actorName || "SDS")],
    ];
    const changedFields = changes
      .slice(0, 6)
      .map((change) => change.label || change.field || "Field")
      .join(", ");
    const detailRows: Array<[string, string]> = changedFields
      ? [...rows, ["Changed Fields", escapeHtml(changedFields)]]
      : rows;

    await Promise.all(
      recipients.map((recipient: any) => {
        const isOfficer = recipient.id === request.officerId;
        const detailUrl = absoluteUrl(
          isOfficer
            ? `/user/bookings/${request.id}`
            : `/user/approvals/${request.id}`,
        );
        const subject = `[Zerve] ${request.requestNumber} was updated`;
        const html = emailLayout({
          preview: `${request.requestNumber} was updated by ${
            actorName || "SDS"
          }.`,
          eyebrow: "Booking update",
          headline: "A reservation booking was updated",
          message:
            "SDS updated this reservation. Review the updated booking details and activity log when needed.",
          badge: "Updated",
          tone: "info",
          rows: detailRows,
          ctaHref: detailUrl,
          ctaLabel: isOfficer ? "View Booking" : "View Approval",
          comment: changesSummary(changes),
        });
        const text = [
          "A reservation booking was updated",
          "",
          `Request No: ${request.requestNumber}`,
          `Activity: ${request.title}`,
          `Updated by: ${actorName || "SDS"}`,
          "",
          changesSummary(changes),
          "",
          `Details: ${detailUrl}`,
        ].join("\n");

        return sendSapfWorkflowEmail({
          to: recipient.email,
          subject,
          html,
          text,
        });
      }),
    );
  } catch (error) {
    console.error("Failed to send SAPF update emails:", error);
  }
}
