import { Badge } from "@/app/components/ui/badge";
import {
  formatSapfDateTime,
  formatSapfTime,
} from "@/app/components/pages/SAPF/sapfSchedule";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { CheckCircle, MapPin, XCircle } from "lucide-react";

const page = async ({ params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const request = await prisma.sAPFRequest.findUnique({
    where: {
      verificationToken: token,
    },
    include: {
      officer: {
        select: {
          name: true,
          email: true,
        },
      },
      venues: {
        include: {
          eventSpace: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      schedules: {
        orderBy: {
          startAt: "asc",
        },
      },
    },
  });

  if (!request || request.status !== "APPROVED") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Verification Failed
            </CardTitle>
            <CardDescription>
              This QR token does not match an approved Zerve reservation.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Badge className="mb-2 w-fit bg-emerald-100 text-emerald-700">
            Verified Approved Reservation
          </Badge>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            {request.title}
          </CardTitle>
          <CardDescription>Request #{request.requestNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">Organization</p>
            <p>{request.organization}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Venue</p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {request.venues
                .map((venue) => venue.eventSpace.name)
                .join(", ")}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-gray-500">Schedule</p>
              <div className="space-y-1">
                {request.schedules.map((schedule) => (
                  <p key={schedule.id}>
                    {formatSapfDateTime(schedule.startAt)} to{" "}
                    {formatSapfTime(schedule.endAt)}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Approved At</p>
              <p>{request.approvedAt ? format(request.approvedAt, "MMM d, yyyy h:mm a") : "Approved"}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Submitting Officer</p>
            <p>{request.officer.name}</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default page;
