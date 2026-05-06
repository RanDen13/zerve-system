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
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  formatSapfDateTime,
  formatSapfDateInputValue,
  formatSapfTime,
  formatSapfTimeInputValue,
} from "@/app/components/pages/SAPF/sapfSchedule";
import { CalendarX, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ScheduleRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

type BlockActionResult = Promise<{ success: boolean; message?: string }>;

function createScheduleRow(): ScheduleRow {
  return {
    id: Math.random().toString(36).slice(2),
    date: "",
    startTime: "",
    endTime: "",
  };
}

function scheduleRowsFromBlock(block: any): ScheduleRow[] {
  const schedules = Array.isArray(block.schedules) ? block.schedules : [];
  if (schedules.length === 0) return [createScheduleRow()];

  return schedules.map((schedule: any, index: number) => ({
    id: schedule.id || `${block.id}-${index}`,
    date: formatSapfDateInputValue(schedule.startAt),
    startTime: formatSapfTimeInputValue(schedule.startAt),
    endTime: formatSapfTimeInputValue(schedule.endAt),
  }));
}

function BlockScheduleRows({
  rows,
  onRowsChange,
}: {
  rows: ScheduleRow[];
  onRowsChange: (rows: ScheduleRow[]) => void;
}) {
  const popup = usePopup();

  const updateRow = (
    rowId: string,
    field: keyof Omit<ScheduleRow, "id">,
    value: string,
  ) => {
    if (
      field === "date" &&
      value &&
      rows.some((row) => row.id !== rowId && row.date === value)
    ) {
      popup.showError("Each schedule day must use a different date.");
      return;
    }

    onRowsChange(
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, [field]: value };
        if (
          field === "startTime" &&
          next.endTime &&
          value &&
          next.endTime <= value
        ) {
          next.endTime = "";
        }
        return next;
      }),
    );
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Day {index + 1}</Label>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={rows.length === 1}
              onClick={() =>
                onRowsChange(rows.filter((item) => item.id !== row.id))
              }
              aria-label={`Remove day ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            name="scheduleDate"
            type="date"
            value={row.date}
            onChange={(event) => updateRow(row.id, "date", event.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start</Label>
              <Input
                name="scheduleStartTime"
                type="time"
                value={row.startTime}
                onChange={(event) =>
                  updateRow(row.id, "startTime", event.target.value)
                }
                required
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                name="scheduleEndTime"
                type="time"
                value={row.endTime}
                min={row.startTime || undefined}
                onChange={(event) =>
                  updateRow(row.id, "endTime", event.target.value)
                }
                required
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onRowsChange([...rows, createScheduleRow()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Day
      </Button>
    </div>
  );
}

function UniversityWideBlockCard({
  block,
  editable,
  onUpdate,
  onDelete,
}: {
  block: any;
  editable: boolean;
  onUpdate?: (formData: FormData) => BlockActionResult;
  onDelete?: (id: string) => BlockActionResult;
}) {
  const popup = usePopup();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState<ScheduleRow[]>(() =>
    scheduleRowsFromBlock(block),
  );
  const schedules = Array.isArray(block.schedules) ? block.schedules : [];

  const resetEdit = () => {
    setRows(scheduleRowsFromBlock(block));
    setIsEditing(false);
  };

  const handleUpdate = async (formData: FormData) => {
    if (!onUpdate) return;
    formData.set("id", block.id);
    const result = await onUpdate(formData);
    if (!result.success) {
      popup.showError(result.message || "Failed to update block.");
      return;
    }
    popup.showSuccess(result.message || "University-wide block updated.");
    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Delete "${block.title}"?`)) return;

    const result = await onDelete(block.id);
    if (!result.success) {
      popup.showError(result.message || "Failed to delete block.");
      return;
    }
    popup.showSuccess(result.message || "University-wide block deleted.");
    router.refresh();
  };

  if (isEditing) {
    return (
      <form
        action={handleUpdate}
        className="space-y-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-4"
      >
        <input type="hidden" name="id" value={block.id} />
        <div>
          <Label>Title</Label>
          <Input name="title" defaultValue={block.title} required />
        </div>
        <BlockScheduleRows rows={rows} onRowsChange={setRows} />
        <div>
          <Label>Reason</Label>
          <Input name="reason" defaultValue={block.reason || ""} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-violet-600 hover:bg-violet-700">
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={resetEdit}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-violet-950 dark:text-violet-100">
            {block.title}
          </p>
          {block.reason && (
            <p className="mt-1 text-sm text-violet-800 dark:text-violet-200">
              {block.reason}
            </p>
          )}
        </div>
        {editable && (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setRows(scheduleRowsFromBlock(block));
                setIsEditing(true);
              }}
              aria-label={`Edit ${block.title}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDelete}
              aria-label={`Delete ${block.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {schedules.map((schedule: any, index: number) => (
          <p
            key={schedule.id || `${schedule.startAt}-${index}`}
            className="flex items-center gap-2 text-sm text-violet-900 dark:text-violet-100"
          >
            <Clock className="h-4 w-4" />
            {formatSapfDateTime(schedule.startAt)} to{" "}
            {formatSapfTime(schedule.endAt)}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function UniversityWideBlocks({
  blocks,
  editable = false,
  onUpdate,
  onDelete,
}: {
  blocks: any[];
  editable?: boolean;
  onUpdate?: (formData: FormData) => BlockActionResult;
  onDelete?: (id: string) => BlockActionResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-violet-700" />
          University-Wide Blocks
        </CardTitle>
        <CardDescription>
          These blocked dates apply to every venue in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
            No university-wide blocks scheduled.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block) => (
              <UniversityWideBlockCard
                key={block.id}
                block={block}
                editable={editable}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
