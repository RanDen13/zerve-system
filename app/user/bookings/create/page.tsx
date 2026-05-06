import SapfBookingForm from "@/app/components/pages/SAPF/SapfBookingForm";
import {
  getApproverOptions,
  getSapfRequestById,
} from "@/app/components/pages/SAPF/SapfActions";
import { getAllEventSpaces } from "@/app/components/pages/Spaces/EventSpaceActions";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Booking unavailable</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/user/bookings">Back to bookings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function hasReachedSds(request: any) {
  const sdsStep = request.approvalSteps?.find(
    (step: any) => step.position === "SDS",
  );
  if (!sdsStep) return false;
  return (
    sdsStep.status !== "PENDING" ||
    (request.currentStepOrder ?? 0) >= sdsStep.stepOrder ||
    request.status === "APPROVED"
  );
}

function canOfficerEditRequest(request: any) {
  if (["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status)) return true;
  if (["SUBMITTED", "IN_REVIEW"].includes(request.status)) {
    return !request.approvalSteps?.some(
      (step: any) => step.position === "ADVISER" && step.status === "APPROVED",
    );
  }
  return false;
}

function canSdsEditRequest(request: any, userId: string) {
  const isAssignedSds = request.approvalSteps?.some(
    (step: any) => step.position === "SDS" && step.reviewerId === userId,
  );
  return (
    isAssignedSds &&
    hasReachedSds(request) &&
    !["CANCELLED", "REJECTED"].includes(request.status)
  );
}

const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; requestId?: string }>;
}) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role?.toUpperCase();
  const { venueId, requestId } = await searchParams;
  if (!requestId && role !== "OFFICER") {
    return <ErrorCard message="Only officers can create bookings." />;
  }

  const [venuesResult, approversResult, requestResult] = await Promise.all([
    getAllEventSpaces(),
    getApproverOptions(),
    requestId ? getSapfRequestById(requestId) : Promise.resolve(null),
  ]);

  if (!venuesResult.success) {
    return <ErrorCard message={venuesResult.message || "Failed to load venues."} />;
  }

  if (!approversResult.success) {
    return (
      <ErrorCard
        message={approversResult.message || "Failed to load approvers."}
      />
    );
  }

  if (requestResult && !requestResult.success) {
    return (
      <ErrorCard
        message={requestResult.message || "Failed to load request."}
      />
    );
  }

  const request = requestResult?.data?.request;
  if (request && role === "OFFICER" && !canOfficerEditRequest(request)) {
    return (
      <ErrorCard message="This request can only be edited before adviser approval or after it has been returned." />
    );
  }

  if (request && role !== "OFFICER" && !canSdsEditRequest(request, session.user.id)) {
    return (
      <ErrorCard message="Only the assigned SDS reviewer can edit this booking after it reaches SDS." />
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {request ? "Edit Booking" : "Create Booking"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select venues and complete the SAPF reservation request.
        </p>
      </div>
      {request?.status === "RETURNED_FOR_REVISION" && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-900 dark:text-orange-100">
          Editing returned request #{request.requestNumber}. Update the details
          and resubmit to continue the approval flow.
        </div>
      )}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
        Pending conflicts will warn you but still allow submission. Approved
        reservations and venue blocks cannot be submitted over.
      </div>
      <SapfBookingForm
        venues={venuesResult.data || []}
        approvers={approversResult.data || {}}
        initialRequest={request}
        editorMode={role === "OFFICER" ? "officer" : "sds"}
        preselectedVenueIds={venueId ? [venueId] : []}
      />
    </div>
  );
};

export default page;
