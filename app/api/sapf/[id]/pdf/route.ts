import { normalizeSapfRequest } from "@/app/components/pages/SAPF/sapfData";
import { getAppUrl } from "@/lib/deployment";
import { prisma } from "@/lib/prisma";
import { renderSapfPdf } from "@/lib/sapf-pdf";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sapf = await prisma.sAPFRequest.findUnique({
    where: { id },
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

  if (!sapf || sapf.status !== "APPROVED" || !sapf.verificationToken) {
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
