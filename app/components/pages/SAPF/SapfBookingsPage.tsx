"use client";

import {
  EmptyState,
  ErrorStateCard,
  InlineLoadingState,
  PageHeader,
  PageShell,
  StatusBadge,
} from "@/app/components/UX";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  MotionItem,
  MotionList,
  MotionSection,
} from "@/app/components/ui/motion";
import { CheckCircle, Clock, History, Loader2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getSapfRequestList } from "./SapfActions";
import SapfPageLoading from "./SapfPageLoading";
import { RequestSummary } from "./SapfRequestDetail";
import {
  emptySapfRequestFilters,
  filterSapfRequests,
  SapfRequestFilters,
  uniqueSapfStatuses,
} from "./SapfRequestFilters";

type BookingTab = "pending" | "following" | "history";
type QuickFilter =
  | "all"
  | "needs_my_decision"
  | "has_concern"
  | "has_officer_request"
  | "has_conflict";
const EMPTY_REQUESTS: any[] = [];

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

function RequestList({
  requests,
  hrefFor,
  empty,
  summaryProps,
}: {
  requests: any[];
  hrefFor: (request: any) => string;
  empty: string;
  summaryProps?: {
    showBadges?: boolean;
    showConflict?: boolean;
    showPdf?: boolean;
  };
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No requests found"
        description={empty}
        icon={<History className="h-6 w-6" />}
      />
    );
  }

  return (
    <MotionList className="space-y-4">
      {requests.map((request: any) => (
        <MotionItem key={request.id}>
          <RequestSummary
            request={request}
            {...summaryProps}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={hrefFor(request)}>View</Link>
              </Button>
            }
          />
        </MotionItem>
      ))}
    </MotionList>
  );
}

export default function SapfBookingsPage() {
  const popup = usePopup();
  const [me, setMe] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<BookingTab>("pending");
  const [tabRequests, setTabRequests] = useState<Record<string, any[]>>({});
  const [loadingTab, setLoadingTab] = useState<BookingTab | null>("pending");
  const [filters, setFilters] = useState(emptySapfRequestFilters);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const loadTab = async (tab: BookingTab, force = false) => {
    if (!force && tabRequests[tab]) return;

    setLoadingTab(tab);
    const result = await getSapfRequestList({
      surface: "bookings",
      view: tab,
    });
    if (!result.success) {
      popup.showError(result.message);
      setLoadingTab(null);
      return;
    }
    setMe(result.data?.me || null);
    setTabRequests((current) => ({
      ...current,
      [tab]: result.data?.requests || [],
    }));
    setLoadingTab(null);
  };

  const refresh = async () => {
    await loadTab(activeTab, true);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadTab("pending");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRequests = tabRequests[activeTab] ?? EMPTY_REQUESTS;
  const filteredRequests = useMemo(
    () => filterSapfRequests(currentRequests, filters),
    [currentRequests, filters],
  );
  const quickFilteredRequests = useMemo(() => {
    if (quickFilter === "all") return filteredRequests;

    return filteredRequests.filter((request: any) => {
      if (quickFilter === "needs_my_decision") {
        return request.approvalSteps?.some(
          (step: any) =>
            step.status === "ACTIVE" &&
            (step.reviewerId === me?.id || me?.role === "SUPER_ADMIN"),
        );
      }
      if (quickFilter === "has_concern") {
        return request.approvalSteps?.some(
          (step: any) =>
            step.concernThread &&
            step.concernThread.status !== "RESOLVED" &&
            ["ACTIVE", "RETURNED"].includes(step.status),
        );
      }
      if (quickFilter === "has_officer_request") {
        return request.changeRequests?.some((item: any) => item.status === "PENDING");
      }
      if (quickFilter === "has_conflict") {
        return Boolean(request.conflictWarning);
      }
      return true;
    });
  }, [filteredRequests, me?.id, me?.role, quickFilter]);
  const statusOptions = useMemo(
    () => uniqueSapfStatuses(currentRequests),
    [currentRequests],
  );
  const tabItems: Array<{
    value: BookingTab;
    label: string;
    icon: ReactNode;
    empty: string;
  }> = [
    {
      value: "pending",
      label: me?.role === "OFFICER" ? "In Progress" : "Needs Review",
      icon: <Clock className="h-4 w-4" />,
      empty:
        me?.role === "OFFICER"
          ? "No in-progress requests match your filters."
          : "No review-queue requests match your filters.",
    },
    ...(me?.role === "OFFICER"
      ? []
      : [
          {
            value: "following" as BookingTab,
            label: "Following",
            icon: <CheckCircle className="h-4 w-4" />,
            empty: "No followed requests match your filters.",
          },
        ]),
    {
      value: "history",
      label: "Closed",
      icon: <History className="h-4 w-4" />,
      empty: "No closed records match your filters.",
    },
  ];

  if (loadingTab && !me) {
    return <SapfPageLoading variant="bookings" />;
  }

  if (!me) {
    return (
      <PageShell>
        <ErrorStateCard
          title="Bookings unavailable"
          description="We could not load your booking data."
          action={
            <Button onClick={refresh} variant="outline" disabled={Boolean(loadingTab)}>
              {loadingTab ? (
                <ButtonSpinner />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              {loadingTab ? "Loading..." : "Try again"}
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <MotionSection>
        <PageHeader
          title={me.role === "OFFICER" ? "My Requests" : "Bookings"}
          description={
            me.role === "OFFICER"
              ? "Drafts, active reservations, and closed requests in one searchable workspace."
              : "Review active requests, follow workflow progress, and audit closed records."
          }
          actions={
            <>
              {me.role === "OFFICER" && (
                <Button asChild>
                  <Link href="/user/bookings/create">Start new request</Link>
                </Button>
              )}
              <Button
                onClick={refresh}
                variant="outline"
                disabled={Boolean(loadingTab)}
              >
                {loadingTab ? (
                  <ButtonSpinner />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                {loadingTab ? "Refreshing..." : "Refresh"}
              </Button>
            </>
          }
        />
      </MotionSection>

      <MotionSection>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = value as BookingTab;
            setActiveTab(tab);
            setFilters(emptySapfRequestFilters);
            setQuickFilter("all");
            void loadTab(tab);
          }}
          className="space-y-4"
        >
          <TabsList
            data-tour="bookings-tabs"
            className={`grid w-full ${
              tabItems.length === 2
                ? "grid-cols-2 md:w-[320px]"
                : "grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.85fr)] md:w-[520px]"
            }`}
          >
            {tabItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="min-w-0 px-1.5 sm:px-2">
                {item.icon}
                <span className="min-w-0 truncate">{item.label}</span>
                <StatusBadge
                  label={String(tabRequests[item.value]?.length ?? 0)}
                  tone={activeTab === item.value ? "default" : "muted"}
                  className="ml-0.5 px-1.5 py-0 text-[10px]"
                />
              </TabsTrigger>
            ))}
          </TabsList>

          <SapfRequestFilters
            value={filters}
            onChange={setFilters}
            statuses={statusOptions}
            resultCount={quickFilteredRequests.length}
            totalCount={currentRequests.length}
          />
          {me.role !== "OFFICER" && (
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "needs_my_decision", label: "Needs my decision" },
                { key: "has_concern", label: "Has concern" },
                { key: "has_officer_request", label: "Officer request" },
                { key: "has_conflict", label: "Has conflict" },
              ].map((chip) => (
                <Button
                  key={chip.key}
                  type="button"
                  size="sm"
                  variant={quickFilter === chip.key ? "default" : "outline"}
                  onClick={() => setQuickFilter(chip.key as QuickFilter)}
                  className="h-8"
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          )}

          {tabItems.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <div className="space-y-4">
                {loadingTab === item.value ? (
                  <InlineLoadingState
                    label="Loading requests"
                    description="Fetching the latest booking records."
                  />
                ) : (
                  <RequestList
                    requests={quickFilteredRequests}
                    hrefFor={(request) =>
                      me.role === "OFFICER"
                        ? `/user/bookings/${request.id}`
                        : `/user/approvals/${request.id}`
                    }
                    empty={item.empty}
                    summaryProps={{
                      showBadges: me.role === "OFFICER",
                      showConflict: me.role === "OFFICER",
                      showPdf: false,
                    }}
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </MotionSection>
    </PageShell>
  );
}
