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
  SapfActivityLog,
} from "./SapfRequestDetail";

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
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
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Approval details unavailable</CardTitle>
            <CardDescription>
              We could not load this request right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refresh} variant="outline" disabled={loading}>
              {loading ? (
                <ButtonSpinner />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              {loading ? "Loading..." : "Try again"}
            </Button>
          </CardContent>
        </Card>
      </div>
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
              Approval Details
            </h1>
            <p className="text-muted-foreground">
              Review and action this request.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
                SDS cancellation stops the approval flow and releases the slot.
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
    </div>
  );
}
