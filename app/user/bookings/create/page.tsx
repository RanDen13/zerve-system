import SapfBookingForm from "@/app/components/pages/SAPF/SapfBookingForm";
import {
  getApproverOptions,
  getSapfRequestById,
} from "@/app/components/pages/SAPF/SapfActions";
import { getEquipmentCatalogForBooking } from "@/app/components/pages/SAPF/EquipmentActions";
import { getAllEventSpaces } from "@/app/components/pages/Spaces/EventSpaceActions";
import {
  Callout,
  ErrorStateCard,
  PageHeader,
  PageShell,
} from "@/app/components/UX";
import { Button } from "@/app/components/ui/button";
import { auth } from "@/lib/auth";
import {
  canBypassSystemMaintenance,
  isSystemMaintenanceActive,
} from "@/lib/system-maintenance";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function ErrorCard({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorStateCard
          title="Booking unavailable"
          description={message}
          className="w-full max-w-md"
          action={
          <Button asChild variant="outline" className="w-full">
            <Link href="/user/bookings">Back to bookings</Link>
          </Button>
          }
        />
      </div>
    </PageShell>
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
  return ["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status);
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
  if (
    !canBypassSystemMaintenance(role) &&
    (await isSystemMaintenanceActive())
  ) {
    return (
      <ErrorCard message="System maintenance is active. Bookings are available again after maintenance ends." />
    );
  }

  if (!requestId && role !== "OFFICER") {
    return <ErrorCard message="Only officers can create bookings." />;
  }

  const [venuesResult, approversResult, requestResult, equipmentResult] = await Promise.all([
    getAllEventSpaces(),
    getApproverOptions(),
    requestId ? getSapfRequestById(requestId) : Promise.resolve(null),
    getEquipmentCatalogForBooking(requestId),
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

  if (!equipmentResult.success) {
    return (
      <ErrorCard
        message={equipmentResult.message || "Failed to load equipment."}
      />
    );
  }

  const request = requestResult?.data?.request;
  if (request && role === "OFFICER" && !canOfficerEditRequest(request)) {
    return (
      <ErrorCard message="Submitted bookings can only be edited after an approver returns them for revision." />
    );
  }

  if (request && role !== "OFFICER" && !canSdsEditRequest(request, session.user.id)) {
    return (
      <ErrorCard message="Only the assigned SDS reviewer can edit this booking after it reaches SDS." />
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={request ? "Edit Booking" : "Create Booking"}
        description="Select one venue and complete the SAPF reservation request."
        backHref="/user/bookings"
      />
      {request?.status === "RETURNED_FOR_REVISION" && (
        <Callout tone="warning" title={`Editing returned request #${request.requestNumber}`}>
          Editing returned request #{request.requestNumber}. Update the details
          and resubmit to continue routing.
        </Callout>
      )}
      <Callout tone="warning" title="Conflict rules">
        Pending conflicts will warn you but still allow submission. Approved
        reservations and venue blocks cannot be submitted over.
      </Callout>
      <SapfBookingForm
        venues={venuesResult.data || []}
        approvers={approversResult.data || {}}
        equipmentItems={equipmentResult.data || []}
        initialRequest={request}
        editorMode={role === "OFFICER" ? "officer" : "sds"}
        preselectedVenueIds={venueId ? [venueId] : []}
      />
    </PageShell>
  );
};

export default page;
