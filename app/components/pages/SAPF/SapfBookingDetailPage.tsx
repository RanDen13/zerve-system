"use client";

import {
  Callout,
  ErrorStateCard,
  PageHeader,
  PageShell,
  StatusBadge,
} from "@/app/components/UX";
import ModalBase from "@/app/components/Popup/ModalBase";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  CalendarClock,
  CheckCircle2,
  FileDown,
  History,
  Loader2,
  PackageCheck,
  PencilLine,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  cancelSapfRequest,
  getSapfRequestById,
  requestSapfEditApproval,
} from "./SapfActions";
import { requestEquipmentReturn } from "./EquipmentActions";
import SapfPageLoading from "./SapfPageLoading";
import SapfReadonlyDetails from "./SapfReadonlyDetails";
import {
  ConcernThreads,
  RequestSummary,
  SapfActivityLog,
} from "./SapfRequestDetail";
import {
  deriveSapfOperationalStatus,
  hasSapfEventEnded,
  isSapfEquipmentReleaseWindowOpen,
  operationalStatusLabel,
} from "./sapfLifecycle";

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

function currentWorkflowStep(request: any) {
  return (
    request.approvalSteps?.find((step: any) => step.status === "ACTIVE") ||
    request.approvalSteps?.find((step: any) => step.status === "RETURNED") ||
    null
  );
}

function lifecycleStepClass(active: boolean, done: boolean) {
  if (done) return "border-emerald-500/30 bg-emerald-500/10";
  if (active) return "border-sky-500/30 bg-sky-500/10";
  return "border-border bg-background";
}

export default function SapfBookingDetailPage({
  requestId,
}: {
  requestId: string;
}) {
  const popup = usePopup();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showEditRequest, setShowEditRequest] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const result = await getSapfRequestById(requestId);
    if (!result.success) {
      popup.showError(result.message);
      setLoading(false);
      return;
    }
    setPayload(result.data);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (loading && !payload) {
    return <SapfPageLoading variant="detail" />;
  }

  if (!payload) {
    return (
      <PageShell>
        <ErrorStateCard
          title="Booking details unavailable"
          description="We could not load this booking right now."
          action={
            <Button onClick={refresh} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { request, me } = payload;
  const sdsStep = request.approvalSteps?.find(
    (step: any) => step.position === "SDS",
  );
  const reachedSds =
    sdsStep &&
    (sdsStep.status !== "PENDING" ||
      (request.currentStepOrder ?? 0) >= sdsStep.stepOrder ||
      request.status === "APPROVED");
  const pendingChangeRequest = request.changeRequests?.find(
    (item: any) => item.status === "PENDING",
  );
  const pendingEditRequest = pendingChangeRequest?.type === "EDIT";
  const pendingCancelRequest = pendingChangeRequest?.type === "CANCEL";
  const canCancel =
    me?.role === "OFFICER" &&
    !["CANCELLED", "REJECTED"].includes(request.status);
  const hasThreads = request.approvalSteps?.some(
    (step: any) => step.concernThread,
  );
  const showChat = hasThreads && me?.role === "OFFICER";
  const canEdit =
    me?.role === "OFFICER" &&
    ["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status);
  const canRequestEdit =
    me?.role === "OFFICER" &&
    reachedSds &&
    !canEdit &&
    !["CANCELLED", "REJECTED"].includes(request.status);
  const cancelNeedsSdsApproval = canCancel && reachedSds;
  const canRequestEquipmentReturn =
    me?.role === "OFFICER" &&
    request.status === "APPROVED" &&
    request.equipmentRequests?.some((item: any) => item.status === "PROVIDED") &&
    hasSapfEventEnded(request);
  const equipmentRequests = Array.isArray(request.equipmentRequests)
    ? request.equipmentRequests
    : [];
  const hasEquipment = equipmentRequests.length > 0;
  const hasPendingEquipment = equipmentRequests.some(
    (item: any) => item.status === "REQUESTED",
  );
  const hasProvidedEquipment = equipmentRequests.some(
    (item: any) => item.status === "PROVIDED",
  );
  const hasReturnRequestedEquipment = equipmentRequests.some(
    (item: any) => item.status === "RETURN_REQUESTED",
  );
  const allEquipmentReturned =
    hasEquipment &&
    equipmentRequests.every((item: any) => item.status === "RETURNED");
  const eventEnded = hasSapfEventEnded(request);
  const eventStarted =
    request.status === "APPROVED" &&
    ["ONGOING", "AWAITING_EQUIPMENT_RETURN", "RETURN_REQUESTED", "COMPLETED"].includes(
      deriveSapfOperationalStatus(request),
    );
  const releaseWindowOpen = isSapfEquipmentReleaseWindowOpen(request);
  const operationalStatus = deriveSapfOperationalStatus(request);
  const operationallyComplete = operationalStatus === "COMPLETED";
  const activeStep = currentWorkflowStep(request);
  const officerActionSummary = canEdit
    ? "You can still edit directly."
    : canRequestEdit
      ? "Direct editing locked. Send edit request to SDS."
      : request.status === "RETURNED_FOR_REVISION"
        ? "Revise request, then resubmit."
        : request.status === "APPROVED"
          ? operationallyComplete
            ? "Completed."
            : operationalStatusLabel(operationalStatus)
          : request.status === "REJECTED"
            ? "Request closed after rejection."
            : request.status === "CANCELLED"
              ? "Request closed after cancellation."
              : "Track progress and wait for current reviewer.";

  const handleCancel = async () => {
    if (cancelling) return;

    const reason = cancelReason.trim();
    if (!reason) {
      popup.showError("Enter a reason before cancelling this reservation.");
      return;
    }

    setCancelling(true);
    try {
      const formData = new FormData();
      formData.set("requestId", request.id);
      formData.set("comment", reason);
      const result = await cancelSapfRequest(formData);

      if (!result.success) {
        popup.showError(result.message || "Failed to cancel reservation.");
        return;
      }

      popup.showSuccess(result.message || "Reservation cancelled.");
      setShowCancel(false);
      setCancelReason("");
      await refresh();
    } finally {
      setCancelling(false);
    }
  };

  const handleEditRequest = async () => {
    if (requestingEdit) return;

    const reason = editReason.trim();
    if (!reason) {
      popup.showError("Enter a reason before requesting edit approval.");
      return;
    }

    setRequestingEdit(true);
    try {
      const formData = new FormData();
      formData.set("requestId", request.id);
      formData.set("comment", reason);
      const result = await requestSapfEditApproval(formData);

      if (!result.success) {
        popup.showError(result.message || "Failed to request edit approval.");
        return;
      }

      popup.showSuccess(result.message || "Edit request sent to SDS.");
      setShowEditRequest(false);
      setEditReason("");
      await refresh();
    } finally {
      setRequestingEdit(false);
    }
  };

  const handleEquipmentReturn = async () => {
    if (requestingReturn) return;

    const confirmed = await popup.showWarning(
      "Mark this event as done and ask the equipment provisioner to pick up the provided equipment?",
    );
    if (!confirmed) return;

    setRequestingReturn(true);
    try {
      const result = await requestEquipmentReturn(request.id);
      if (!result.success) {
        popup.showError(result.message || "Failed to request equipment return.");
        return;
      }
      popup.showSuccess(result.message || "Equipment return requested.");
      await refresh();
    } finally {
      setRequestingReturn(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Booking Details"
        description="Track details, approvals, activity, and SDS-gated changes."
        backHref="/user/bookings"
        actions={
          <>
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/user/bookings/create?requestId=${request.id}`}>
                <PencilLine className="mr-2 h-4 w-4" />
                {request.status === "RETURNED_FOR_REVISION"
                  ? "Edit and Resubmit"
                  : "Edit Reservation"}
              </Link>
            </Button>
          )}
          {canRequestEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditRequest(true)}
              disabled={Boolean(pendingChangeRequest) || requestingEdit}
            >
              {requestingEdit ? (
                <ButtonSpinner />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {pendingEditRequest ? "Edit Pending SDS" : "Request Edit"}
            </Button>
          )}
          {canRequestEquipmentReturn && (
            <Button
              type="button"
              variant="outline"
              onClick={handleEquipmentReturn}
              disabled={requestingReturn}
            >
              {requestingReturn ? (
                <ButtonSpinner />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              {requestingReturn ? "Sending..." : "Event Done"}
            </Button>
          )}
          {me?.role === "OFFICER" &&
            request.status === "APPROVED" &&
            hasProvidedEquipment &&
            !eventEnded && (
              <Button type="button" variant="outline" disabled>
                <RotateCcw className="mr-2 h-4 w-4" />
                Return After Event
              </Button>
            )}
          <Button asChild variant="outline">
            <a
              href={`/api/sapf/${request.id}/preview`}
              target="_blank"
              rel="noreferrer"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Preview Reservation
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/sapf/${request.id}/docx`}>
              <FileDown className="mr-2 h-4 w-4" />
              Download DOCX
            </a>
          </Button>
          {canCancel && (
            <Button
              onClick={() => setShowCancel(true)}
              variant="destructive"
              disabled={loading || cancelling || Boolean(pendingChangeRequest)}
            >
              {cancelling ? (
                <ButtonSpinner />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {pendingCancelRequest
                ? "Cancellation Pending SDS"
                : cancelling
                  ? "Cancelling..."
                  : cancelNeedsSdsApproval
                    ? "Request Cancellation"
                    : "Cancel Reservation"}
            </Button>
          )}
          <Button onClick={refresh} variant="outline" disabled={loading}>
            {loading ? (
              <ButtonSpinner />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          </>
        }
      />

      {pendingChangeRequest && (
        <Callout
          tone="info"
          icon={<ShieldCheck className="h-4 w-4" />}
          title={
            pendingChangeRequest.type === "EDIT"
              ? "Edit request pending SDS approval"
              : "Cancellation request pending SDS approval"
          }
        >
          {pendingChangeRequest.reason}
        </Callout>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Workflow Status
          </CardTitle>
          <CardDescription>
            Officer-side summary of current request state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Approval
            </p>
            <div className="mt-2">
              <StatusBadge status={request.status} />
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Operations
            </p>
            <div className="mt-2">
              <StatusBadge
                status={operationalStatus}
                label={operationalStatusLabel(operationalStatus)}
              />
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current owner
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {activeStep?.reviewer?.name || activeStep?.label || "No active reviewer"}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What you can do now
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {officerActionSummary}
            </p>
          </div>
        </CardContent>
      </Card>

      {request.status === "APPROVED" && (
        <Card className="overflow-hidden border-sky-500/20">
          <CardHeader className="bg-sky-500/10">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Post-Approval Lifecycle
            </CardTitle>
            <CardDescription>
              Approval authorizes the reservation. The booking is operationally
              complete only after the event window and equipment return are done.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
            <div className={lifecycleStepClass(false, true) + " rounded-lg border p-4"}>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 font-semibold">Approved</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The request is authorized and visible as approved/booked.
              </p>
            </div>
            <div
              className={
                lifecycleStepClass(
                  operationalStatus === "WAITING_FOR_EVENT" ||
                    operationalStatus === "ONGOING",
                  eventEnded,
                ) + " rounded-lg border p-4"
              }
            >
              <CalendarClock className="h-5 w-5 text-sky-600" />
              <p className="mt-3 font-semibold">
                {eventEnded
                  ? "Event Done"
                  : eventStarted
                    ? "Ongoing"
                    : "Waiting for Event"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {eventStarted && !eventEnded
                  ? "Venue use is currently active."
                  : releaseWindowOpen
                  ? "Event is inside the equipment release window."
                  : "Equipment release opens 3 days before the event."}
              </p>
            </div>
            <div
              className={
                lifecycleStepClass(
                  hasEquipment && (hasPendingEquipment || hasProvidedEquipment),
                  !hasEquipment || hasProvidedEquipment || allEquipmentReturned,
                ) + " rounded-lg border p-4"
              }
            >
              <PackageCheck className="h-5 w-5 text-indigo-600" />
              <p className="mt-3 font-semibold">Equipment Provision</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {!hasEquipment
                  ? "No borrowed equipment requested."
                  : hasPendingEquipment
                    ? "Provisioner releases equipment during the release window."
                    : hasProvidedEquipment
                      ? "Equipment is currently with the officer/event."
                      : "Equipment was handled."}
              </p>
            </div>
            <div
              className={
                lifecycleStepClass(
                  hasReturnRequestedEquipment || hasProvidedEquipment,
                  operationallyComplete,
                ) + " rounded-lg border p-4"
              }
            >
              <RotateCcw className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 font-semibold">
                {operationallyComplete ? "Officially Complete" : "Return / Close"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {!hasEquipment
                  ? eventEnded
                    ? "Event is complete. No equipment return needed."
                    : "Completion happens after the event ends."
                  : allEquipmentReturned
                    ? "Provisioner confirmed equipment returned."
                    : hasReturnRequestedEquipment
                      ? "Waiting for provisioner return confirmation."
                      : hasProvidedEquipment
                        ? "Officer returns equipment after the event ends."
                        : "Waiting for equipment to be provided first."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList
          className={`grid w-full ${
            showChat ? "grid-cols-3 md:w-[440px]" : "grid-cols-2 md:w-[320px]"
          }`}
        >
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">
            <History className="h-4 w-4" />
            Activity
          </TabsTrigger>
          {showChat && <TabsTrigger value="chat">Chat</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <RequestSummary request={request} showPdf={false} />
          <SapfReadonlyDetails request={request} />
        </TabsContent>

        <TabsContent value="activity">
          <SapfActivityLog request={request} />
        </TabsContent>

        {showChat && (
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Concern Threads</CardTitle>
                <CardDescription>
                  Private discussion between officer and reviewer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConcernThreads request={request} onRefresh={refresh} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {showCancel && (
        <ModalBase onClose={() => setShowCancel(false)}>
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>
                {cancelNeedsSdsApproval
                  ? "Request Cancellation"
                  : "Cancel Reservation"}
              </CardTitle>
              <CardDescription>
                {cancelNeedsSdsApproval
                  ? "This booking has reached SDS, so cancellation needs SDS approval before the slot is released."
                  : "This will stop routing and release the slot."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Explain why this reservation needs to be cancelled."
                  className="min-h-28"
                  disabled={cancelling}
                  required
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancel(false)}
                  disabled={cancelling}
                >
                  Keep Reservation
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling && <ButtonSpinner />}
                  {cancelling
                    ? cancelNeedsSdsApproval
                      ? "Sending..."
                      : "Cancelling..."
                    : cancelNeedsSdsApproval
                      ? "Send to SDS"
                      : "Cancel Reservation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </ModalBase>
      )}

      {showEditRequest && (
        <ModalBase onClose={() => setShowEditRequest(false)}>
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Request Edit Approval</CardTitle>
              <CardDescription>
                SDS must approve before this booking can be revised.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="edit-reason"
                  value={editReason}
                  onChange={(event) => setEditReason(event.target.value)}
                  placeholder="Explain what needs to be changed."
                  className="min-h-28"
                  disabled={requestingEdit}
                  required
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditRequest(false)}
                  disabled={requestingEdit}
                >
                  Keep Reservation
                </Button>
                <Button
                  type="button"
                  onClick={handleEditRequest}
                  disabled={requestingEdit || !editReason.trim()}
                >
                  {requestingEdit && <ButtonSpinner />}
                  {requestingEdit ? "Sending..." : "Send to SDS"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </ModalBase>
      )}
    </PageShell>
  );
}
