"use client";

import {
  ErrorStateCard,
  PageHeader,
  PageShell,
  StatusBadge,
} from "@/app/components/UX";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { format, formatDistanceToNowStrict, isWithinInterval } from "date-fns";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Eye,
  Loader2,
  PackageCheck,
  PlusCircle,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  confirmEquipmentReturned,
  createDefaultEquipmentItems,
  getEquipmentWorkspace,
  markEquipmentProvided,
  saveEquipmentItem,
} from "./EquipmentActions";
import {
  EQUIPMENT_SUPPORT_LABELS,
  equipmentStatusLabel,
} from "./sapfEquipment";
import { formatSapfDate, formatSapfTime } from "./sapfSchedule";
import {
  deriveSapfOperationalStatus,
  operationalStatusLabel,
} from "./sapfLifecycle";
import SapfPageLoading from "./SapfPageLoading";
import Link from "next/link";

type QueueBucket =
  | "all"
  | "incoming"
  | "ready"
  | "provided"
  | "returns"
  | "completed";

const queueTabs: Array<{ id: QueueBucket; label: string }> = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "ready", label: "Ready" },
  { id: "provided", label: "Provided" },
  { id: "returns", label: "Returns" },
  { id: "completed", label: "Completed" },
];

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

function scheduleLabel(request: any) {
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];
  if (!schedules.length) return "No schedule";
  if (schedules.length === 1) {
    const schedule = schedules[0];
    return `${formatSapfDate(schedule.startAt)} ${formatSapfTime(
      schedule.startAt,
    )}-${formatSapfTime(schedule.endAt)}`;
  }
  return `${schedules.length} days, ${formatSapfDate(
    schedules[0].startAt,
  )} to ${formatSapfDate(schedules[schedules.length - 1].startAt)}`;
}

function venueLabel(request: any) {
  const venues = Array.isArray(request.venues) ? request.venues : [];
  const names = venues
    .map((venue: any) => venue.eventSpace?.name)
    .filter(Boolean)
    .join(", ");

  return names || request.venue || "No venue";
}

function firstStart(request: any) {
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];
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

function canReleaseEquipment(request: any) {
  const start = firstStart(request);
  if (!start) return false;
  const now = new Date();
  const releaseWindow = new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000);
  return now >= releaseWindow;
}

function statusClass(status: string) {
  if (status === "PROVIDED")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "RETURN_REQUESTED")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "RETURNED")
    return "border-muted bg-muted text-muted-foreground";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function requestStatusClass(status?: string) {
  if (status === "APPROVED")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED" || status === "CANCELLED")
    return "border-red-200 bg-red-50 text-red-700";
  if (status === "RETURNED_FOR_REVISION")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
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

function groupBucket(group: { request: any; rows: any[] }): QueueBucket {
  if (group.rows.every((row) => row.status === "RETURNED")) return "completed";
  if (group.rows.some((row) => row.status === "RETURN_REQUESTED"))
    return "returns";
  if (group.rows.some((row) => row.status === "PROVIDED")) return "provided";
  if (group.request.status === "APPROVED") return "ready";
  return "incoming";
}

function requestMatches(group: { request: any; rows: any[] }, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    group.request.requestNumber,
    group.request.title,
    group.request.officer?.name,
    group.request.officer?.email,
    venueLabel(group.request),
    ...group.rows.map((row) => row.equipmentItem?.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function requestedQuantityByItem(rows: any[]) {
  return rows.reduce((acc: Record<string, number>, row) => {
    if (row.status === "RETURNED") return acc;
    acc[row.equipmentItemId] = (acc[row.equipmentItemId] || 0) + row.quantity;
    return acc;
  }, {});
}

function InventoryForm({
  item,
  onSaved,
}: {
  item?: any;
  onSaved: () => Promise<void>;
}) {
  const popup = usePopup();
  const [saving, setSaving] = useState(false);

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    const result = await saveEquipmentItem(formData);
    setSaving(false);

    if (!result.success) {
      popup.showError(result.message || "Failed to save equipment.");
      return;
    }
    popup.showSuccess(result.message || "Equipment saved.");
    await onSaved();
  };

  return (
    <form
      action={handleSave}
      className="grid gap-3 rounded-md border p-3 md:grid-cols-[1.2fr_1fr_120px_120px_auto]"
    >
      {item?.id && <input type="hidden" name="itemId" value={item.id} />}
      <div className="space-y-1">
        <Label>Name</Label>
        <Input name="name" defaultValue={item?.name || ""} required />
      </div>
      <div className="space-y-1">
        <Label>SAPF field</Label>
        <Select name="supportLabel" defaultValue={item?.supportLabel || "NONE"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Not shown in form</SelectItem>
            {EQUIPMENT_SUPPORT_LABELS.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Total</Label>
        <Input
          name="totalQuantity"
          type="number"
          min={0}
          defaultValue={item?.totalQuantity ?? 0}
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select name="active" defaultValue={item?.active === false ? "false" : "true"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? <ButtonSpinner /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: any;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-border bg-card text-foreground";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function EquipmentProvisioningPage() {
  const popup = usePopup();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [tab, setTab] = useState<QueueBucket>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await getEquipmentWorkspace();
      if (!result.success) {
        popup.showError(result.message || "Failed to load equipment.");
        setWorkspace(null);
        return;
      }
      setWorkspace(result.data);
    } catch (error) {
      console.error("Equipment workspace refresh failed:", error);
      popup.showError(
        error instanceof Error
          ? error.message
          : "Failed to load equipment workspace.",
      );
      setWorkspace(null);
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
  const lowStockItems = (workspace?.items || []).filter((item: any) => {
    if (!item.active || item.totalQuantity <= 0) return true;
    const available = item.totalQuantity - (allocations[item.id] || 0);
    return available <= 0;
  });

  const filteredGroups = groupedRequests.filter((group) => {
    const bucket = groupBucket(group);
    return (tab === "all" || bucket === tab) && requestMatches(group, query);
  });
  const activeSelectedId = filteredGroups.some(
    (group) => group.request.id === selectedId,
  )
    ? selectedId
    : (filteredGroups[0]?.request.id ?? "");
  const selectedGroup =
    filteredGroups.find((group) => group.request.id === activeSelectedId) ||
    filteredGroups[0] ||
    null;

  const stats = {
    incoming: groupedRequests.filter((group) => groupBucket(group) === "incoming").length,
    ready: groupedRequests.filter((group) => groupBucket(group) === "ready").length,
    dueSoon: groupedRequests.filter(
      (group) =>
        dueSoon(group.request) &&
        group.rows.some((row) => row.status === "REQUESTED") &&
        group.request.status === "APPROVED",
    ).length,
    returns: groupedRequests.filter((group) => groupBucket(group) === "returns").length,
    completed: groupedRequests.filter((group) => groupBucket(group) === "completed").length,
  };

  const addDefaults = async () => {
    setSetupSaving(true);
    const result = await createDefaultEquipmentItems();
    setSetupSaving(false);
    if (!result.success) {
      popup.showError(result.message || "Failed to add defaults.");
      return;
    }
    popup.showSuccess(result.message || "Default equipment added.");
    await refresh();
  };

  const submitAction = async (
    requestId: string,
    action: "provide" | "return",
  ) => {
    setActionId(`${action}:${requestId}`);
    const formData = new FormData();
    formData.set("requestId", requestId);
    const result =
      action === "provide"
        ? await markEquipmentProvided(formData)
        : await confirmEquipmentReturned(formData);
    setActionId("");

    if (!result.success) {
      popup.showError(result.message || "Action failed.");
      return;
    }
    popup.showSuccess(result.message || "Action complete.");
    await refresh();
  };

  if (loading && !workspace) return <SapfPageLoading />;

  if (!workspace) {
    return (
      <PageShell>
        <ErrorStateCard
          title="Equipment unavailable"
          description="Could not load equipment workspace."
          action={
            <Button onClick={refresh} variant="outline">
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
        title="Equipment Provisioning"
        description="Inventory, release queue, returns, and due-soon equipment."
        actions={
          <Button onClick={refresh} variant="outline" disabled={loading}>
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {(workspace.items || []).length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold">No inventory yet</h2>
              <p className="mt-1 text-sm">
                Add mapped equipment first. Bookings with equipment only become
                useful here after inventory exists.
              </p>
            </div>
            <Button onClick={addDefaults} disabled={setupSaving}>
              {setupSaving ? <ButtonSpinner /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Default Equipment
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Incoming" value={stats.incoming} icon={ClipboardList} />
        <StatTile label="Ready" value={stats.ready} icon={PackageCheck} tone="success" />
        <StatTile label="Due Soon" value={stats.dueSoon} icon={CalendarClock} tone="warning" />
        <StatTile label="Returns" value={stats.returns} icon={RotateCcw} />
        <StatTile
          label="Inventory Alerts"
          value={lowStockItems.length}
          icon={AlertTriangle}
          tone={lowStockItems.length ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Equipment Queue
                </CardTitle>
                <CardDescription>
                  Incoming requests stay locked until SAPF is fully approved.
                </CardDescription>
              </div>
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search request, officer, item"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {queueTabs.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={tab === item.id ? "default" : "outline"}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}{" "}
                  <span className="text-xs text-muted-foreground/80">
                    (
                    {item.id === "all"
                      ? groupedRequests.length
                      : groupedRequests.filter((group) => groupBucket(group) === item.id).length}
                    )
                  </span>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Boxes className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">No matching equipment requests</p>
                <p className="text-sm text-muted-foreground">
                  Change filter, or wait for approved SAPF bookings with equipment.
                </p>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const bucket = groupBucket(group);
                const hasRequested = group.rows.some(
                  (row) => row.status === "REQUESTED",
                );
                const hasReturnRequested = group.rows.some(
                  (row) => row.status === "RETURN_REQUESTED",
                );
                const canProvide =
                  hasRequested &&
                  group.request.status === "APPROVED" &&
                  canReleaseEquipment(group.request);
                const firstDate = firstStart(group.request);
                const operationalStatus = deriveSapfOperationalStatus(
                  group.request,
                );

                return (
                  <div
                    key={group.request.id}
                    className={`rounded-lg border p-4 ${
                      selectedGroup?.request.id === group.request.id
                        ? "border-primary"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-semibold text-muted-foreground">
                            #{group.request.requestNumber}
                          </p>
                          <Badge variant="outline" className={requestStatusClass(group.request.status)}>
                            {String(group.request.status || "Unknown").replaceAll("_", " ")}
                          </Badge>
                          <Badge variant="outline">
                            {queueTabs.find((item) => item.id === bucket)?.label}
                          </Badge>
                          {group.request.status === "APPROVED" && (
                            <StatusBadge
                              status={operationalStatus}
                              label={operationalStatusLabel(operationalStatus)}
                            />
                          )}
                          {dueSoon(group.request) && bucket === "ready" && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Due soon
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-1 text-lg font-bold text-foreground">
                          {group.request.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {group.request.officer?.name || "Unknown officer"} -{" "}
                          {scheduleLabel(group.request)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {venueLabel(group.request)}
                          {firstDate
                            ? ` - starts in ${formatDistanceToNowStrict(firstDate)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedId(group.request.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                        {hasRequested && (
                          <Button
                            type="button"
                            onClick={() => void submitAction(group.request.id, "provide")}
                            disabled={Boolean(actionId) || !canProvide}
                            title={
                              canProvide
                                ? "Mark equipment provided"
                                : group.request.status !== "APPROVED"
                                  ? "Available after full approval"
                                  : "Available starting 3 days before the event"
                            }
                          >
                            {actionId === `provide:${group.request.id}` ? (
                              <ButtonSpinner />
                            ) : (
                              <PackageCheck className="mr-2 h-4 w-4" />
                            )}
                            {canProvide
                              ? "Mark Provided"
                              : group.request.status === "APPROVED"
                                ? "Not time yet"
                                : "Waiting approval"}
                          </Button>
                        )}
                        {hasReturnRequested && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void submitAction(group.request.id, "return")}
                            disabled={Boolean(actionId)}
                          >
                            {actionId === `return:${group.request.id}` ? (
                              <ButtonSpinner />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Confirm Returned
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {group.rows.map((row) => {
                        const total = row.equipmentItem?.totalQuantity ?? 0;
                        const allocated = allocations[row.equipmentItemId] || 0;
                        const available = Math.max(0, total - allocated);
                        const warning =
                          row.status !== "RETURNED" && allocated > total;
                        return (
                          <div
                            key={row.id}
                            className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {row.equipmentItem?.name || "Equipment"} x {row.quantity}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                Available now: {available} / {total}
                                {warning ? " - low stock" : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className={statusClass(row.status)}>
                              {equipmentStatusLabel(row.status)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Request Detail
              </CardTitle>
              <CardDescription>
                Selected queue item, timeline, and availability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedGroup ? (
                <p className="text-sm text-muted-foreground">No request selected.</p>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-mono font-semibold text-muted-foreground">
                      #{selectedGroup.request.requestNumber}
                    </p>
                    <h3 className="text-base font-bold">{selectedGroup.request.title}</h3>
                    <p className="text-muted-foreground">
                      {selectedGroup.request.officer?.name || "Unknown officer"}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <p>
                      <span className="font-semibold">Venue:</span>{" "}
                      {venueLabel(selectedGroup.request)}
                    </p>
                    <p>
                      <span className="font-semibold">Schedule:</span>{" "}
                      {scheduleLabel(selectedGroup.request)}
                    </p>
                    <p>
                      <span className="font-semibold">Submitted:</span>{" "}
                      {format(new Date(selectedGroup.request.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                    <p>
                      <span className="font-semibold">Queue status:</span>{" "}
                      {queueTabs.find((item) => item.id === groupBucket(selectedGroup))?.label}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/user/bookings/${selectedGroup.request.id}`}>
                      Open booking record
                    </Link>
                  </Button>
                  <div className="space-y-2">
                    <p className="font-semibold">Timeline</p>
                    {selectedGroup.rows.map((row) => (
                      <div key={row.id} className="rounded-md border p-3">
                        <p className="font-medium">
                          {row.equipmentItem?.name || "Equipment"} x {row.quantity}
                        </p>
                        <p className="text-muted-foreground">
                          Requested {format(new Date(row.createdAt), "MMM d, h:mm a")}
                        </p>
                        {row.providedAt && (
                          <p className="text-muted-foreground">
                            Provided by {row.providedBy?.name || "Provisioner"}{" "}
                            {format(new Date(row.providedAt), "MMM d, h:mm a")}
                          </p>
                        )}
                        {row.returnRequestedAt && (
                          <p className="text-muted-foreground">
                            Return requested{" "}
                            {format(new Date(row.returnRequestedAt), "MMM d, h:mm a")}
                          </p>
                        )}
                        {row.returnedAt && (
                          <p className="text-muted-foreground">
                            Returned by {row.returnedBy?.name || "Provisioner"}{" "}
                            {format(new Date(row.returnedAt), "MMM d, h:mm a")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {lowStockItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Inventory Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.map((item: any) => {
                  const allocated = allocations[item.id] || 0;
                  return (
                    <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-muted-foreground">
                        {item.active ? "Active" : "Inactive"} - available{" "}
                        {Math.max(0, item.totalQuantity - allocated)} /{" "}
                        {item.totalQuantity}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Inventory
              </CardTitle>
              <CardDescription>
                Quantities here control what officers can request.
              </CardDescription>
            </div>
            {(workspace.items || []).length > 0 && (
              <Button onClick={addDefaults} variant="outline" disabled={setupSaving}>
                {setupSaving ? <ButtonSpinner /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Fill Defaults
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(workspace.items || []).map((item: any) => {
            const allocated = allocations[item.id] || 0;
            const available = Math.max(0, item.totalQuantity - allocated);
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    Available {available} / {item.totalQuantity}
                  </Badge>
                  <Badge variant="outline">
                    {item.supportLabel || "Not mapped"}
                  </Badge>
                  {!item.active && (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      Inactive
                    </Badge>
                  )}
                </div>
                <InventoryForm item={item} onSaved={refresh} />
              </div>
            );
          })}
          <InventoryForm onSaved={refresh} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
