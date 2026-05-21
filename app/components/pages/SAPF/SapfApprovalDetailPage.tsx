"use client";

import {
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
  FileDown,
  History,
  Loader2,
  PencilLine,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  cancelSapfRequest,
  getApproverOptions,
  getSapfRequestById,
} from "./SapfActions";
import SapfPageLoading from "./SapfPageLoading";
import {
  ConcernThreads,
  RequestDetail,
  routePositionLabel,
  SapfActivityLog,
} from "./SapfRequestDetail";

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

function stepDueLabel(step: any) {
  if (!step) return "No active deadline";
  const timeoutByPosition: Record<string, number> = {
    ADVISER: 3,
    DEAN: 3,
    SDS: 3,
    SAS: 3,
    VPAA_ASSISTANT: 3,
    VPAA: 3,
    UNIVERSITY_PRESIDENT: 10,
    ADDITIONAL_SIGNATORY: 3,
  };
  const timeoutDays =
    timeoutByPosition[String(step.position || "").toUpperCase()] ?? 3;
  const activeAt = new Date(step.updatedAt || step.createdAt || Date.now()).getTime();
  const dueAt = new Date(activeAt + timeoutDays * 24 * 60 * 60 * 1000).getTime();
  const diffMs = dueAt - Date.now();
  if (diffMs <= 0) return "Overdue";
  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days <= 0) return `${remHours}h left`;
  return `${days}d ${remHours}h left`;
}

export default function SapfApprovalDetailPage({
  requestId,
}: {
  requestId: string;
}) {
  const popup = usePopup();
  const [payload, setPayload] = useState<{
    request: any;
    me: any;
    approvers: Record<string, any[]>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [requestResult, approversResult] = await Promise.all([
      getSapfRequestById(requestId),
      getApproverOptions(),
    ]);
    if (!requestResult.success) {
      popup.showError(requestResult.message);
      setLoading(false);
      return;
    }
    if (!approversResult.success) {
      popup.showError(approversResult.message);
      setLoading(false);
      return;
    }
    setPayload({
      ...requestResult.data,
      approvers: approversResult.data || {},
    });
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
          title="Approval details unavailable"
          description="We could not load this request right now."
          action={
            <Button onClick={refresh} variant="outline" disabled={loading}>
              {loading ? (
                <ButtonSpinner />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              {loading ? "Loading..." : "Try again"}
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { request, me, approvers } = payload;

  const hasThreads = request.approvalSteps?.some(
    (step: any) => step.concernThread,
  );
  const showChat = hasThreads && me?.role !== "SUPER_ADMIN";
  const sdsStep = request.approvalSteps?.find(
    (step: any) => step.position === "SDS" && step.reviewerId === me?.id,
  );
  const reachedSds =
    sdsStep &&
    (sdsStep.status !== "PENDING" ||
      (request.currentStepOrder ?? 0) >= sdsStep.stepOrder ||
      request.status === "APPROVED");
  const canSdsManage =
    Boolean(sdsStep) &&
    reachedSds &&
    !["CANCELLED", "REJECTED"].includes(request.status);
  const activeStep = currentWorkflowStep(request);
  const isMyTurn = activeStep?.reviewerId === me?.id;
  const reviewerSummary = isMyTurn
    ? "Your decision needed now."
    : activeStep
      ? `Waiting on ${activeStep.reviewer?.name || activeStep.label}.`
      : request.status === "APPROVED"
        ? "Request fully approved."
        : "No active review step.";
  const pendingOfficerRequests = (request.changeRequests || []).filter(
    (item: any) => item.status === "PENDING",
  );
  const hasPendingOfficerRequests = pendingOfficerRequests.length > 0;
  const suggestedRouteLabel = request.suggestedRoutePosition
    ? routePositionLabel(request.suggestedRoutePosition)
    : "";
  const returnLoopCount = (request.activityLogs || []).filter(
    (log: any) => log.action === "RETURNED",
  ).length;

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

  return (
    <PageShell>
      <PageHeader
        title="Approval Details"
        description="Review the request, inspect activity, and complete the next workflow action."
        backHref="/user/bookings"
        actions={
          <>
          {canSdsManage && (
            <Button asChild variant="outline">
              <Link href={`/user/bookings/create?requestId=${request.id}`}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit Booking
              </Link>
            </Button>
          )}
          {canSdsManage && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowCancel(true)}
              disabled={cancelling}
            >
              {cancelling ? (
                <ButtonSpinner />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {cancelling ? "Cancelling..." : "Cancel Booking"}
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

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Review Status
          </CardTitle>
          <CardDescription>
            Reviewer-side summary of current workflow state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current status
            </p>
            <div className="mt-2">
              <StatusBadge status={request.status} />
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active step
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {activeStep?.label || "No active step"}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Review focus
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {reviewerSummary}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle>Decision Brief</CardTitle>
          <CardDescription>
            Fast review snapshot before action.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Due timer</p>
            <p className="text-sm font-semibold text-foreground">
              {stepDueLabel(activeStep)}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Conflict state</p>
            <p className="text-sm font-semibold text-foreground">
              {request.conflictWarning ? "Pending conflict warning" : "No conflict warning"}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Officer requests</p>
            <p className="text-sm font-semibold text-foreground">
              {pendingOfficerRequests.length} pending
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Recommended action</p>
            <p className="text-sm font-semibold text-foreground">
              {hasPendingOfficerRequests
                ? "Open Officer Requests tab first"
                : isMyTurn
                  ? "Review details then decide"
                  : "Monitor active reviewer"}
            </p>
          </div>
        </CardContent>
      </Card>
      {suggestedRouteLabel && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Route Recommendation</CardTitle>
            <CardDescription>
              {request.suggestedRouteBy?.name || "Reviewer"} recommended{" "}
              {suggestedRouteLabel}
              {request.suggestedRouteReason
                ? `: ${request.suggestedRouteReason}`
                : "."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {returnLoopCount >= 3 && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-300">
              Return-loop warning
            </CardTitle>
            <CardDescription>
              This request has been returned {returnLoopCount} times. Align on
              exact revision scope before another return.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList
          className={`grid w-full ${
            showChat
              ? hasPendingOfficerRequests
                ? "grid-cols-4 md:w-[620px]"
                : "grid-cols-3 md:w-[440px]"
              : hasPendingOfficerRequests
                ? "grid-cols-3 md:w-[500px]"
                : "grid-cols-2 md:w-[320px]"
          }`}
        >
          <TabsTrigger value="details">Details</TabsTrigger>
          {hasPendingOfficerRequests && (
            <TabsTrigger value="officer-requests">
              Officer Requests
            </TabsTrigger>
          )}
          <TabsTrigger value="activity">
            <History className="h-4 w-4" />
            Activity
          </TabsTrigger>
          {showChat && <TabsTrigger value="chat">Chat</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <RequestDetail
            request={request}
            me={me}
            onRefresh={refresh}
            approvers={approvers}
            showConcernThreads={false}
          />
        </TabsContent>

        <TabsContent value="activity">
          <SapfActivityLog request={request} />
        </TabsContent>

        {hasPendingOfficerRequests && (
          <TabsContent value="officer-requests">
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <CardTitle>Officer Change Requests</CardTitle>
                <CardDescription>
                  Edit or cancellation requests waiting SDS decision.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingOfficerRequests.map((item: any) => (
                  <div
                    key={item.id}
                    className="rounded-md border bg-background p-3"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {item.type === "EDIT" ? "Edit request" : "Cancellation request"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
              <CardTitle>Cancel Booking</CardTitle>
              <CardDescription>
                SDS cancellation stops routing and releases the slot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sds-cancel-reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="sds-cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Explain why SDS is cancelling this booking."
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
                  Keep Booking
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling && <ButtonSpinner />}
                  {cancelling ? "Cancelling..." : "Cancel Booking"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </ModalBase>
      )}
    </PageShell>
  );
}
