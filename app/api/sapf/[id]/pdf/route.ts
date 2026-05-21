import { normalizeSapfRequest } from "@/app/components/pages/SAPF/sapfData";
import { auth } from "@/lib/auth";
import { getAppUrl } from "@/lib/deployment";
import { prisma } from "@/lib/prisma";
import { renderSapfPdf } from "@/lib/sapf-pdf";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json(
      { message: "Unauthorized access." },
      { status: 401 },
    );
  }

  const role = session.user.role?.toUpperCase();
  const allowedRoles = [
    "OFFICER",
    "APPROVER",
    "ADMIN",
    "SUPER_ADMIN",
    "EQUIPMENT_PROVISIONER",
  ];

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json(
      { message: "Your account role is not valid." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const canSeeAllRequests = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const requestWhere = canSeeAllRequests
    ? { id, status: "APPROVED" as const }
    : role === "OFFICER"
      ? { id, status: "APPROVED" as const, officerId: session.user.id }
      : role === "EQUIPMENT_PROVISIONER"
        ? { id, status: "APPROVED" as const, equipmentRequests: { some: {} } }
        : {
            id,
            status: "APPROVED" as const,
            OR: [
              { approvalSteps: { some: { reviewerId: session.user.id } } },
              { approvalActions: { some: { actorId: session.user.id } } },
            ],
          };

  const sapf = await prisma.sAPFRequest.findFirst({
    where: requestWhere,
    include: {
      officer: true,
      venues: { include: { eventSpace: true }, orderBy: { createdAt: "asc" } },
      schedules: { orderBy: { startAt: "asc" } },
      coreValues: { select: { value: true }, orderBy: { createdAt: "asc" } },
      graduateAttributes: {
        select: { value: true },
        orderBy: { createdAt: "asc" },
      },
      supportRequests: {
        select: { value: true },
        orderBy: { createdAt: "asc" },
      },
      approvalSteps: {
        include: {
          reviewer: true,
        },
        orderBy: {
          stepOrder: "asc",
        },
      },
      approvalActions: {
        include: {
          actor: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      activityLogs: {
        include: {
          actor: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!sapf || !sapf.verificationToken) {
    return NextResponse.json(
      { message: "Approved reservation not found." },
      { status: 404 },
    );
  }

  const baseUrl = getAppUrl();
  const verifyUrl = `${baseUrl}/verify/${sapf.verificationToken}`;
  const bytes = await renderSapfPdf({
    request: normalizeSapfRequest(sapf),
    mode: "approved",
    verifyUrl,
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sapf.requestNumber}-approved-reservation.pdf"`,
    },
  });
}
