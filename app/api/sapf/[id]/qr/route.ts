import { auth } from "@/lib/auth";
import { getAppUrl } from "@/lib/deployment";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

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
    select: {
      verificationToken: true,
    },
  });

  if (!sapf?.verificationToken) {
    return NextResponse.json(
      { message: "Approved reservation not found." },
      { status: 404 },
    );
  }

  const verifyUrl = `${getAppUrl()}/verify/${sapf.verificationToken}`;
  const bytes = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 260 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": "image/png",
    },
  });
}
