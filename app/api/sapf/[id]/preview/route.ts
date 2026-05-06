import { normalizeSapfRequest } from "@/app/components/pages/SAPF/sapfData";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderSapfPdf } from "@/lib/sapf-pdf";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
  const allowedRoles = ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"];
  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json(
      { message: "Your account role is not valid." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const requestWhere =
    role === "SUPER_ADMIN"
      ? { id }
      : role === "OFFICER"
        ? { id, officerId: session.user.id }
        : {
            id,
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

  if (!sapf) {
    return NextResponse.json(
      { message: "Request not found." },
      { status: 404 },
    );
  }

  const bytes = await renderSapfPdf({
    request: normalizeSapfRequest(sapf),
    mode: "preview",
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sapf.requestNumber}-reservation-preview.pdf"`,
    },
  });
}
