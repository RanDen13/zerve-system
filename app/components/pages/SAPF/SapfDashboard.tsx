"use client";

import {
  EmptyState,
  ErrorStateCard,
  PageHeader,
  PageShell,
  StatCard,
} from "@/app/components/UX";
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
  MotionSection,
} from "@/app/components/ui/motion";
import { format } from "date-fns";
import {
  Bell,
  Building2,
  CheckCircle,
  CirclePlus,
  Clock,
  History,
  Loader2,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
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
      <PageShell>
        <ErrorStateCard
          title="Workspace unavailable"
          description="We could not load your reservation workspace."
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
  const quickActions = [
    ...(workspace.me.role === "OFFICER"
      ? [
          {
            href: "/user/bookings/create",
            title: "Create a booking",
            description: "Start a venue reservation and save drafts before submitting.",
            icon: <CirclePlus className="h-5 w-5" />,
          },
          {
            href: "/user/spaces",
            title: "Browse venues",
            description: "Compare venue capacity, availability, and booking rules.",
            icon: <Building2 className="h-5 w-5" />,
          },
        ]
      : [
          {
            href: "/user/approvals",
            title: "Review approvals",
            description: "Open requests that need your decision or follow-up.",
            icon: <ShieldCheck className="h-5 w-5" />,
          },
        ]),
    {
      href: "/user/bookings",
      title: "View booking records",
      description: "Search pending, followed, and history records.",
      icon: <History className="h-5 w-5" />,
    },
  ];

  return (
    <PageShell>
      <MotionSection>
        <PageHeader
          title="Zerve Workspace"
          description={
            <>
            Signed in as {workspace.me.name} -{" "}
            {workspace.me.role.replaceAll("_", " ")}
            </>
          }
          actions={
            <Button onClick={refresh} variant="outline" disabled={loading}>
              {loading ? (
                <ButtonSpinner />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          }
        />
      </MotionSection>

      <MotionList className="dashboard-grid" data-tour="dashboard-summary">
        <MotionItem>
          <StatCard
            label="Current"
            value={stats.current}
            description="Active requests in progress"
            href="/user/bookings"
            actionLabel="Open"
            icon={<Clock className="h-5 w-5" />}
            tone="info"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            label="History"
            value={stats.history}
            description="Completed, rejected, and cancelled"
            href="/user/bookings"
            actionLabel="View"
            icon={<History className="h-5 w-5" />}
            tone="muted"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            label="Approved"
            value={stats.approved}
            description="Reservations ready or completed"
            href="/user/bookings"
            actionLabel="Review"
            icon={<CheckCircle className="h-5 w-5" />}
            tone="success"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            label="Private threads"
            value={stats.conversations}
            description="Concern threads that may need replies"
            href="/user/bookings"
            actionLabel="Check"
            icon={<MessageSquare className="h-5 w-5" />}
            tone="warning"
          />
        </MotionItem>
      </MotionList>

      <MotionList className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <MotionItem key={action.href}>
            <StatCard
              label={action.title}
              value=""
              description={action.description}
              href={action.href}
              actionLabel="Go"
              icon={action.icon}
            />
          </MotionItem>
        ))}
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
            <EmptyState
              title="No active requests"
              description="There are no venue reservations currently moving through the approval flow."
              action={
                workspace.me.role === "OFFICER" ? (
                  <Button asChild>
                    <Link href="/user/bookings/create">Create booking</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/user/approvals">Open approvals</Link>
                  </Button>
                )
              }
            />
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

      <MotionSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Recent workflow updates that may need your attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.notifications.length === 0 ? (
              <EmptyState
                title="No new notifications"
                description="Important workflow updates will appear here."
                icon={<Bell className="h-6 w-6" />}
              />
            ) : (
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
            )}
          </CardContent>
        </Card>
      </MotionSection>
    </PageShell>
  );
}
