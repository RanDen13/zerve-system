"use client";

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
  ArrowLeft,
  FileDown,
  History,
  Loader2,
  PencilLine,
  RefreshCcw,
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
import SapfPageLoading from "./SapfPageLoading";
import SapfReadonlyDetails from "./SapfReadonlyDetails";
import {
  ConcernThreads,
  RequestSummary,
  SapfActivityLog,
} from "./SapfRequestDetail";

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
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
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Booking details unavailable</CardTitle>
            <CardDescription>
              We could not load this booking right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refresh} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
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
  const adviserApproved = request.approvalSteps?.some(
    (step: any) => step.position === "ADVISER" && step.status === "APPROVED",
  );
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
    (["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status) ||
      (["SUBMITTED", "IN_REVIEW"].includes(request.status) &&
        !adviserApproved));
  const canRequestEdit =
    me?.role === "OFFICER" &&
    reachedSds &&
    !canEdit &&
    !["CANCELLED", "REJECTED"].includes(request.status);
  const cancelNeedsSdsApproval = canCancel && reachedSds;

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

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/user/bookings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Booking Details
            </h1>
            <p className="text-muted-foreground">
              Track details, approvals, activity, and SDS-gated changes.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button asChild variant="outline">
            <a href={`/api/sapf/${request.id}/preview`} target="_blank">
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
        </div>
      </div>

      {pendingChangeRequest && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-950 dark:text-blue-100">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {pendingChangeRequest.type === "EDIT"
                ? "Edit request pending SDS approval"
                : "Cancellation request pending SDS approval"}
            </p>
            <p className="mt-1 text-blue-900/80 dark:text-blue-100/80">
              {pendingChangeRequest.reason}
            </p>
          </div>
        </div>
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
                  : "This will stop the approval flow and release the slot."}
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
    </div>
  );
}
