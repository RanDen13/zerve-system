"use client";

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
import { format } from "date-fns";
import {
  CheckCircle,
  Loader2,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  confirmEquipmentReturned,
  getEquipmentWorkspace,
  markEquipmentProvided,
  saveEquipmentItem,
} from "./EquipmentActions";
import {
  EQUIPMENT_SUPPORT_LABELS,
  equipmentStatusLabel,
} from "./sapfEquipment";
import { formatSapfDate, formatSapfTime } from "./sapfSchedule";
import SapfPageLoading from "./SapfPageLoading";

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

function statusClass(status: string) {
  if (status === "PROVIDED")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "RETURN_REQUESTED")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "RETURNED")
    return "border-muted bg-muted text-muted-foreground";
  return "border-amber-200 bg-amber-50 text-amber-700";
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
  return Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(a.request.createdAt).getTime() -
      new Date(b.request.createdAt).getTime(),
  );
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
    <form action={handleSave} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1.2fr_1fr_120px_120px_auto]">
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

export default function EquipmentProvisioningPage() {
  const popup = usePopup();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

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
  const activeGroups = groupedRequests.filter((group) =>
    group.rows.some((row) => row.status !== "RETURNED"),
  );
  const returnedGroups = groupedRequests.filter((group) =>
    group.rows.every((row) => row.status === "RETURNED"),
  );

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
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Equipment unavailable</CardTitle>
            <CardDescription>Could not load equipment workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refresh} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Equipment Provisioning
          </h1>
          <p className="text-muted-foreground">
            Inventory and booking equipment queue.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Inventory
          </CardTitle>
          <CardDescription>
            Quantities here control what officers can request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(workspace.items || []).map((item: any) => (
            <InventoryForm key={item.id} item={item} onSaved={refresh} />
          ))}
          <InventoryForm onSaved={refresh} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Booking Queue
          </CardTitle>
          <CardDescription>
            First submitted booking appears first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active equipment requests.
            </p>
          ) : (
            activeGroups.map((group) => {
              const hasRequested = group.rows.some(
                (row) => row.status === "REQUESTED",
              );
              const hasReturnRequested = group.rows.some(
                (row) => row.status === "RETURN_REQUESTED",
              );

              return (
                <div key={group.request.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-muted-foreground">
                        #{group.request.requestNumber}
                      </p>
                      <h3 className="text-lg font-bold text-foreground">
                        {group.request.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {group.request.officer?.name || "Unknown officer"} -{" "}
                        {scheduleLabel(group.request)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted{" "}
                        {format(new Date(group.request.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hasRequested && (
                        <Button
                          type="button"
                          onClick={() => void submitAction(group.request.id, "provide")}
                          disabled={Boolean(actionId)}
                        >
                          {actionId === `provide:${group.request.id}` ? (
                            <ButtonSpinner />
                          ) : (
                            <PackageCheck className="mr-2 h-4 w-4" />
                          )}
                          Mark Provided
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
                    {group.rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {row.equipmentItem?.name || "Equipment"} x {row.quantity}
                        </span>
                        <Badge variant="outline" className={statusClass(row.status)}>
                          {equipmentStatusLabel(row.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {returnedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Returned</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {returnedGroups.slice(0, 8).map((group) => (
              <div
                key={group.request.id}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
              >
                <span className="font-semibold">
                  #{group.request.requestNumber} {group.request.title}
                </span>
                <span className="text-muted-foreground">
                  {group.rows
                    .map((row) => `${row.equipmentItem?.name} x ${row.quantity}`)
                    .join(", ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
