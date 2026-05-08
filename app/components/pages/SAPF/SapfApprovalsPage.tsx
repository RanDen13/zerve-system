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

type ApprovalTab = "pending" | "following" | "history";
const EMPTY_REQUESTS: any[] = [];

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

function ApprovalRequestList({
  requests,
  empty,
  summaryProps,
}: {
  requests: any[];
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
        title="No approvals found"
        description={empty}
        icon={<CheckCircle className="h-6 w-6" />}
      />
    );
  }

  return requests.map((request: any) => (
    <div key={request.id}>
      <RequestSummary
        request={request}
        {...summaryProps}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/user/approvals/${request.id}`}>View</Link>
          </Button>
        }
      />
    </div>
  ));
}

export default function SapfApprovalsPage() {
  const popup = usePopup();
  const [me, setMe] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ApprovalTab>("pending");
  const [tabRequests, setTabRequests] = useState<Record<string, any[]>>({});
  const [loadingTab, setLoadingTab] = useState<ApprovalTab | null>("pending");
  const [filters, setFilters] = useState(emptySapfRequestFilters);

  const loadTab = async (tab: ApprovalTab, force = false) => {
    if (!force && tabRequests[tab]) return;

    setLoadingTab(tab);
    const result = await getSapfRequestList({
      surface: "approvals",
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
  const statusOptions = useMemo(
    () => uniqueSapfStatuses(currentRequests),
    [currentRequests],
  );
  const tabItems: Array<{
    value: ApprovalTab;
    label: string;
    shortLabel: string;
    icon: ReactNode;
    empty: string;
  }> = [
    {
      value: "pending",
      label: "Pending approvals",
      shortLabel: "Pending",
      icon: <Clock className="h-4 w-4" />,
      empty: "No active reviews match your filters.",
    },
    {
      value: "following",
      label: "Following",
      shortLabel: "Following",
      icon: <CheckCircle className="h-4 w-4" />,
      empty: "No followed requests match your filters.",
    },
    {
      value: "history",
      label: "Old approvals",
      shortLabel: "History",
      icon: <History className="h-4 w-4" />,
      empty: "No approval history records match your filters.",
    },
  ];

  if (loadingTab && !me) {
    return <SapfPageLoading variant="approvals" />;
  }

  if (!me) {
    return (
      <PageShell>
        <ErrorStateCard
          title="Approvals unavailable"
          description="We could not load your approval queue."
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
      <PageHeader
        title="Approvals"
        description="Review active requests, follow workflow progress, and audit completed decisions."
        actions={
          <Button onClick={refresh} variant="outline" disabled={Boolean(loadingTab)}>
            {loadingTab ? (
              <ButtonSpinner />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {loadingTab ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {me.role === "OFFICER" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approvals unavailable
            </CardTitle>
            <CardDescription>
              Approvals are visible to approvers and admins only.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = value as ApprovalTab;
            setActiveTab(tab);
            setFilters(emptySapfRequestFilters);
            void loadTab(tab);
          }}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
            {tabItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.icon}
                {item.shortLabel}
                <StatusBadge
                  label={String(tabRequests[item.value]?.length ?? 0)}
                  tone={activeTab === item.value ? "default" : "muted"}
                  className="ml-1 px-1.5 py-0 text-[10px]"
                />
              </TabsTrigger>
            ))}
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <SapfRequestFilters
                value={filters}
                onChange={setFilters}
                statuses={statusOptions}
                resultCount={filteredRequests.length}
                totalCount={currentRequests.length}
              />
            </CardContent>
          </Card>

          {tabItems.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <div className="space-y-4">
                {loadingTab === item.value ? (
                  <InlineLoadingState
                    label="Loading approvals"
                    description="Fetching the latest approval records."
                  />
                ) : (
                  <ApprovalRequestList
                    requests={filteredRequests}
                    empty={item.empty}
                    summaryProps={{
                      showBadges: false,
                      showConflict: false,
                      showPdf: false,
                    }}
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </PageShell>
  );
}
