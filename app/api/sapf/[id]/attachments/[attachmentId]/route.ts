import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function safeFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, "_");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
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

  const { id, attachmentId } = await params;
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
    select: { id: true },
  });

  if (!sapf) {
    return NextResponse.json(
      { message: "Request not found." },
      { status: 404 },
    );
  }

  const attachment = await prisma.sAPFAttachment.findFirst({
    where: {
      id: attachmentId,
      requestId: sapf.id,
    },
    select: {
      fileName: true,
      mimeType: true,
      data: true,
    },
  });

  if (!attachment) {
    return NextResponse.json(
      { message: "Attachment not found." },
      { status: 404 },
    );
  }

  const previewRequested = new URL(request.url).searchParams.get("preview");
  const canPreview =
    attachment.mimeType.startsWith("image/") ||
    attachment.mimeType === "application/pdf";
  const disposition =
    previewRequested === "1" && canPreview ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `${disposition}; filename="${safeFileName(
        attachment.fileName,
      )}"`,
    },
  });
}
