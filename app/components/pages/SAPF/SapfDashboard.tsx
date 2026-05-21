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
          request.approvalSteps.filter(
            (step: any) =>
              step.concernThread &&
              step.concernThread.status !== "RESOLVED" &&
              ["ACTIVE", "RETURNED"].includes(step.status),
          ).length,
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
  const isOfficer = workspace.me.role === "OFFICER";
  const quickActions = [
    ...(isOfficer
      ? [
          {
            key: "start-request",
            href: "/user/bookings/create",
            title: "Start new request",
            description: "Build reservation, save draft, then submit to adviser and SDS routing.",
            icon: <CirclePlus className="h-5 w-5" />,
          },
          {
            key: "check-venues",
            href: "/user/spaces",
            title: "Check venues",
            description: "Compare venue capacity, availability, and booking lead times.",
            icon: <Building2 className="h-5 w-5" />,
          },
        ]
      : [
          {
            key: "review-queue",
            href: "/user/bookings",
            title: "Open review queue",
            description: "See requests waiting for your action now.",
            icon: <ShieldCheck className="h-5 w-5" />,
          },
        ]),
    {
      key: "track-requests",
      href: "/user/bookings",
      title: isOfficer ? "Track my requests" : "Track linked requests",
      description: isOfficer
        ? "See drafts, active requests, and closed records."
        : "See active queue, followed requests, and closed records.",
      icon: <History className="h-5 w-5" />,
    },
  ];

  return (
    <PageShell>
      <MotionSection>
        <PageHeader
          title={isOfficer ? "Officer Workspace" : "Approval Workspace"}
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

      <MotionList
        className="dashboard-grid gap-4 md:gap-5"
        data-tour="dashboard-summary"
      >
        <MotionItem>
          <StatCard
            label={isOfficer ? "Active Requests" : "Active Reviews"}
            value={stats.current}
            description={
              isOfficer
                ? "Drafts, submitted, and revision items still moving"
                : "Requests still moving through routing near you"
            }
            href="/user/bookings"
            actionLabel="Open"
            icon={<Clock className="h-5 w-5" />}
            tone="info"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            label="Closed"
            value={stats.history}
            description="Approved, rejected, and cancelled records"
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
            description={
              isOfficer
                ? "Reservations already cleared"
                : "Reservations completed in workflow"
            }
            href="/user/bookings"
            actionLabel="Review"
            icon={<CheckCircle className="h-5 w-5" />}
            tone="success"
          />
        </MotionItem>
        <MotionItem>
          <StatCard
            label="Concern Threads"
            value={stats.conversations}
            description="Private concern threads that may need replies"
            href="/user/bookings"
            actionLabel="Check"
            icon={<MessageSquare className="h-5 w-5" />}
            tone="warning"
          />
        </MotionItem>
      </MotionList>

      <MotionList className="grid gap-4 md:grid-cols-3 md:gap-5">
        {quickActions.map((action) => (
          <MotionItem key={action.key}>
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

      <MotionList className="grid gap-4 md:grid-cols-2 md:gap-5">
        <MotionItem>
        <Card className="panel-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isOfficer ? "What to do next" : "Review focus"}
            </CardTitle>
            <CardDescription>
              {isOfficer
                ? "Best next move for officer-side workflow."
                : "Best next move for reviewer-side workflow."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {isOfficer ? (
              <>
                <p>1 pending item usually means draft, active review, or revision request.</p>
                <p>Open the request detail to see the current reviewer, SDS route, and allowed actions.</p>
              </>
            ) : (
              <>
                <p>Pending approvals count shows requests waiting for your direct action.</p>
                <p>Following requests stay visible even when SDS routes them to another reviewer.</p>
              </>
            )}
          </CardContent>
        </Card>
        </MotionItem>

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
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current progress
          </CardTitle>
          <CardDescription>
            {currentRequests.length} active request
            {currentRequests.length === 1 ? "" : "s"} in routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentRequests.length === 0 ? (
            <EmptyState
              title="No active requests"
              description="There are no venue reservations currently moving through routing."
              action={
                workspace.me.role === "OFFICER" ? (
                  <Button asChild>
                    <Link href="/user/bookings/create">Create booking</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/user/bookings">Open bookings</Link>
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
                          ? requestHref(notification.requestId)
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
