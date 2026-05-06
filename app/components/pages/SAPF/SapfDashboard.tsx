"use client";

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
  MotionItem,
  MotionList,
  MotionPage,
  MotionSection,
} from "@/app/components/ui/motion";
import { format } from "date-fns";
import {
  Bell,
  CheckCircle,
  Clock,
  History,
  Loader2,
  MessageSquare,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSapfWorkspace } from "./SapfActions";
import SapfPageLoading from "./SapfPageLoading";
import { RequestSummary } from "./SapfRequestDetail";

const activeStatuses = new Set([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "RETURNED_FOR_REVISION",
]);

const historyStatuses = new Set(["APPROVED", "REJECTED", "CANCELLED"]);

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

export default function SapfDashboard() {
  const popup = usePopup();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const result = await getSapfWorkspace();
    if (!result.success) {
      popup.showError(result.message);
      setLoading(false);
      return;
    }
    setWorkspace(result.data);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const requests = workspace?.requests || [];
    return {
      current: requests.filter((request: any) =>
        activeStatuses.has(request.status),
      ).length,
      history: requests.filter((request: any) =>
        historyStatuses.has(request.status),
      ).length,
      approved: requests.filter((request: any) => request.status === "APPROVED")
        .length,
      conversations: requests.reduce(
        (sum: number, request: any) =>
          sum +
          request.approvalSteps.filter((step: any) => step.concernThread)
            .length,
        0,
      ),
    };
  }, [workspace]);
  const currentRequests = useMemo(() => {
    const requests = workspace?.requests || [];
    return requests.filter((request: any) =>
      activeStatuses.has(request.status),
    );
  }, [workspace]);

  if (loading && !workspace) {
    return <SapfPageLoading />;
  }

  if (!workspace) {
    return (
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Workspace unavailable</CardTitle>
            <CardDescription>
              We could not load your reservation workspace.
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

  const reviewerCurrent = workspace.requests.filter((request: any) =>
    request.approvalSteps.some(
      (step: any) =>
        step.status === "ACTIVE" &&
        (step.reviewerId === workspace.me.id ||
          workspace.me.role === "SUPER_ADMIN"),
    ),
  );
  const waitingApprovalCount = reviewerCurrent.length;
  const requestHref = (requestId: string) =>
    workspace.me.role === "OFFICER"
      ? `/user/bookings/${requestId}`
      : `/user/approvals/${requestId}`;

  return (
    <MotionPage className="space-y-8 p-4 lg:p-8">
      <MotionSection className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Zerve Workspace
          </h1>
          <p className="text-muted-foreground">
            Signed in as {workspace.me.name} -{" "}
            {workspace.me.role.replaceAll("_", " ")}
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          {loading ? (
            <ButtonSpinner />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </MotionSection>

      <MotionList className="grid gap-4 md:grid-cols-4" data-tour="dashboard-summary">
        <MotionItem>
        <Card className="panel-hover">
          <CardContent className="flex items-center gap-4 p-5">
            <Clock className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.current}</p>
              <p className="text-sm text-muted-foreground">Current</p>
            </div>
          </CardContent>
        </Card>
        </MotionItem>
        <MotionItem>
        <Card className="panel-hover">
          <CardContent className="flex items-center gap-4 p-5">
            <History className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.history}</p>
              <p className="text-sm text-muted-foreground">History</p>
            </div>
          </CardContent>
        </Card>
        </MotionItem>
        <MotionItem>
        <Card className="panel-hover">
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        </MotionItem>
        <MotionItem>
        <Card className="panel-hover">
          <CardContent className="flex items-center gap-4 p-5">
            <MessageSquare className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{stats.conversations}</p>
              <p className="text-sm text-muted-foreground">Private threads</p>
            </div>
          </CardContent>
        </Card>
        </MotionItem>
      </MotionList>

      <MotionList className="grid gap-4 md:grid-cols-2">
        {workspace.me.role !== "OFFICER" && (
          <MotionItem>
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Pending approvals
              </CardTitle>
              <CardDescription>
                Requests waiting for your review.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-bold">{waitingApprovalCount}</p>
              <Button asChild variant="outline">
                <Link href="/user/bookings">Open bookings</Link>
              </Button>
            </CardContent>
          </Card>
          </MotionItem>
        )}

        <MotionItem>
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Booking history
            </CardTitle>
            <CardDescription>
              Approved, rejected, and cancelled requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-bold">{stats.history}</p>
            <Button asChild variant="outline">
              <Link href="/user/bookings">View history</Link>
            </Button>
          </CardContent>
        </Card>
        </MotionItem>
      </MotionList>

      <MotionSection data-tour="dashboard-progress">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current progress
          </CardTitle>
          <CardDescription>
            {currentRequests.length} active request
            {currentRequests.length === 1 ? "" : "s"} in the approval flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active venue reservation requests right now.
            </p>
          ) : (
            <MotionList className="space-y-4">
            {currentRequests.map((request: any) => (
              <MotionItem key={request.id} className="space-y-3">
                <RequestSummary request={request} showPdf={false} />
                <div className="flex justify-end">
                  <Button asChild variant="outline">
                    <Link href={requestHref(request.id)}>View</Link>
                  </Button>
                </div>
              </MotionItem>
            ))}
            </MotionList>
          )}
        </CardContent>
      </Card>
      </MotionSection>

      {workspace.notifications.length > 0 && (
        <MotionSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MotionList className="grid gap-3 md:grid-cols-2">
            {workspace.notifications.map((notification: any) => (
              <MotionItem key={notification.id} className="rounded-lg border bg-background/60 p-3 shadow-xs">
                <p className="text-sm font-semibold">{notification.title}</p>
                <p className="text-sm text-muted-foreground">
                  {notification.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                </p>
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={
                        notification.requestId
                          ? `/user/approvals/${notification.requestId}`
                          : "/user/bookings"
                      }
                    >
                      View booking
                    </Link>
                  </Button>
                </div>
              </MotionItem>
            ))}
            </MotionList>
          </CardContent>
        </Card>
        </MotionSection>
      )}
    </MotionPage>
  );
}
