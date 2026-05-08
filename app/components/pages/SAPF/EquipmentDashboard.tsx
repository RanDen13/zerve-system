"use client";

import { ErrorStateCard, PageHeader, PageShell, StatCard } from "@/app/components/UX";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { formatDistanceToNowStrict, isWithinInterval } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEquipmentWorkspace } from "./EquipmentActions";
import SapfPageLoading from "./SapfPageLoading";

function firstStart(request: any) {
  const schedules = Array.isArray(request?.schedules) ? request.schedules : [];
  const first = schedules[0]?.startAt;
  return first ? new Date(first) : null;
}

function dueSoon(request: any) {
  const start = firstStart(request);
  if (!start) return false;
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return isWithinInterval(start, { start: now, end: threeDays });
}

function requestSummary(group: any) {
  const names = group.rows
    .map((row: any) => row.equipmentItem?.name)
    .filter(Boolean)
    .join(", ");
  return names || "Equipment request";
}

function groupByRequest(rows: any[]) {
  const grouped = new Map<string, { request: any; rows: any[] }>();
  rows.forEach((row) => {
    if (!row.request) return;
    const existing = grouped.get(row.requestId) || {
      request: row.request,
      rows: [],
    };
    existing.rows.push(row);
    grouped.set(row.requestId, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => {
    const aStart = firstStart(a.request)?.getTime() || 0;
    const bStart = firstStart(b.request)?.getTime() || 0;
    return aStart - bStart;
  });
}

function queueBucket(group: { request: any; rows: any[] }) {
  if (group.rows.every((row) => row.status === "RETURNED")) return "completed";
  if (group.rows.some((row) => row.status === "RETURN_REQUESTED"))
    return "returns";
  if (group.rows.some((row) => row.status === "PROVIDED")) return "provided";
  if (group.request.status === "APPROVED") return "ready";
  return "incoming";
}

function requestedQuantityByItem(rows: any[]) {
  return rows.reduce((acc: Record<string, number>, row) => {
    if (row.status === "RETURNED") return acc;
    acc[row.equipmentItemId] = (acc[row.equipmentItemId] || 0) + row.quantity;
    return acc;
  }, {});
}

export default function EquipmentDashboard() {
  const popup = usePopup();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await getEquipmentWorkspace();
      if (!result.success) {
        popup.showError(result.message || "Failed to load equipment workspace.");
        setWorkspace(null);
        return;
      }
      setWorkspace(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedRequests = useMemo(
    () => groupByRequest(workspace?.requests || []),
    [workspace],
  );
  const allocations = useMemo(
    () => requestedQuantityByItem(workspace?.requests || []),
    [workspace],
  );

  const stats = useMemo(() => {
    const incoming = groupedRequests.filter(
      (group) => queueBucket(group) === "incoming",
    ).length;
    const ready = groupedRequests.filter(
      (group) => queueBucket(group) === "ready",
    ).length;
    const returns = groupedRequests.filter(
      (group) => queueBucket(group) === "returns",
    ).length;
    const dueSoonCount = groupedRequests.filter(
      (group) =>
        dueSoon(group.request) &&
        group.rows.some((row) => row.status === "REQUESTED") &&
        group.request.status === "APPROVED",
    ).length;
    const lowStock = (workspace?.items || []).filter((item: any) => {
      if (!item.active || item.totalQuantity <= 0) return true;
      const available = item.totalQuantity - (allocations[item.id] || 0);
      return available <= 0;
    }).length;

    return {
      incoming,
      ready,
      returns,
      dueSoon: dueSoonCount,
      lowStock,
    };
  }, [allocations, groupedRequests, workspace]);

  const spotlight = useMemo(
    () =>
      groupedRequests
        .filter(
          (group) =>
            queueBucket(group) === "ready" || queueBucket(group) === "returns",
        )
        .slice(0, 5),
    [groupedRequests],
  );

  if (loading && !workspace) return <SapfPageLoading />;

  if (!workspace) {
    return (
      <PageShell>
        <ErrorStateCard
          title="Equipment dashboard unavailable"
          description="We could not load the equipment workspace right now."
          action={
            <Button onClick={refresh} variant="outline" disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Equipment Dashboard"
        description="Track incoming requests, urgent releases, returns, and inventory risk."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/user/equipment">
                <Wrench className="mr-2 h-4 w-4" />
                Open workspace
              </Link>
            </Button>
            <Button onClick={refresh} variant="outline" disabled={loading}>
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="dashboard-grid">
        <StatCard
          label="Incoming"
          value={stats.incoming}
          description="Requests waiting on booking approval"
          href="/user/equipment"
          actionLabel="View queue"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Ready to release"
          value={stats.ready}
          description="Approved bookings needing provision"
          href="/user/equipment"
          actionLabel="Open ready"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Returns"
          value={stats.returns}
          description="Equipment marked for pickup or confirmation"
          href="/user/equipment"
          actionLabel="Check returns"
          icon={<RotateCcw className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Due soon"
          value={stats.dueSoon}
          description="Approved requests starting within 3 days"
          href="/user/equipment"
          actionLabel="Review"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Inventory alerts"
          value={stats.lowStock}
          description="Low stock or inactive equipment items"
          href="/user/equipment"
          actionLabel="Inspect"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={stats.lowStock > 0 ? "danger" : "muted"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Queue spotlight</CardTitle>
            <CardDescription>
              Highest-value requests that likely need your attention first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {spotlight.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No urgent equipment activity right now.
              </p>
            ) : (
              spotlight.map((group) => {
                const start = firstStart(group.request);
                const bucket = queueBucket(group);
                return (
                  <div
                    key={group.request.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-semibold text-muted-foreground">
                          #{group.request.requestNumber}
                        </p>
                        <h3 className="text-sm font-semibold">
                          {group.request.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {requestSummary(group)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {start
                            ? `Starts in ${formatDistanceToNowStrict(start)}`
                            : "No schedule yet"}
                        </p>
                      </div>
                      <span className="rounded-full border px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
                        {bucket}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory snapshot</CardTitle>
            <CardDescription>
              Current catalog health for the equipment pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Catalog items</p>
              <p className="mt-1 text-3xl font-bold">
                {(workspace.items || []).length}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Active items</p>
              <p className="mt-1 text-3xl font-bold">
                {(workspace.items || []).filter((item: any) => item.active).length}
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/user/equipment">
                <Wrench className="mr-2 h-4 w-4" />
                Manage inventory and queue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
