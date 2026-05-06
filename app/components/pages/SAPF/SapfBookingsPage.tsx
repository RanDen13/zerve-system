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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  MotionItem,
  MotionList,
  MotionPage,
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
    return <p className="text-sm text-muted-foreground">{empty}</p>;
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
      label: "Pending",
      icon: <Clock className="h-4 w-4" />,
      empty: "No pending requests match your filters.",
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
      label: "Old",
      icon: <History className="h-4 w-4" />,
      empty: "No old requests match your filters.",
    },
  ];

  if (loadingTab && !me) {
    return <SapfPageLoading variant="bookings" />;
  }

  if (!me) {
    return (
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Bookings unavailable</CardTitle>
            <CardDescription>
              We could not load your booking data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refresh} variant="outline" disabled={Boolean(loadingTab)}>
              {loadingTab ? (
                <ButtonSpinner />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              {loadingTab ? "Loading..." : "Try again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MotionPage className="space-y-8 p-4 lg:p-8">
      <MotionSection className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground">
            Pending reviews, followed requests, and old venue reservation
            records.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={Boolean(loadingTab)}>
          {loadingTab ? (
            <ButtonSpinner />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          {loadingTab ? "Refreshing..." : "Refresh"}
        </Button>
      </MotionSection>

      <MotionSection>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = value as BookingTab;
            setActiveTab(tab);
            setFilters(emptySapfRequestFilters);
            void loadTab(tab);
          }}
          className="space-y-4"
        >
          <TabsList
            data-tour="bookings-tabs"
            className={`grid w-full ${
              tabItems.length === 2
                ? "grid-cols-2 md:w-[320px]"
                : "grid-cols-3 md:w-[420px]"
            }`}
          >
            {tabItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.icon}
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <SapfRequestFilters
            value={filters}
            onChange={setFilters}
            statuses={statusOptions}
            resultCount={filteredRequests.length}
            totalCount={currentRequests.length}
          />

          {tabItems.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <div className="space-y-4">
                {loadingTab === item.value ? (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <RequestList
                    requests={filteredRequests}
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
    </MotionPage>
  );
}
