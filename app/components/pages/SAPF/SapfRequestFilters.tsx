"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Search, X } from "lucide-react";

export type SapfRequestFilterState = {
  query: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

export const emptySapfRequestFilters: SapfRequestFilterState = {
  query: "",
  status: "ALL",
  dateFrom: "",
  dateTo: "",
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function venueText(request: any) {
  const venues = (request.venues || [])
    .map((item: any) => item?.eventSpace?.name || item?.name)
    .filter(Boolean);

  return venues.length ? venues.join(" ") : request.venue || "";
}

function searchHaystack(request: any) {
  const approvalText = (request.approvalSteps || [])
    .flatMap((step: any) => [
      step.label,
      step.position,
      step.status,
      step.reviewer?.name,
      step.reviewer?.email,
      step.reviewer?.accounts?.[0]?.title,
    ])
    .filter(Boolean)
    .join(" ");

  return normalize(
    [
      request.requestNumber,
      request.title,
      request.organization,
      request.department,
      request.departmentCategory,
      request.status,
      request.officer?.name,
      request.officer?.email,
      venueText(request),
      approvalText,
    ].join(" "),
  );
}

function startOfLocalDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function endOfLocalDate(value: string) {
  return value ? new Date(`${value}T23:59:59.999`) : null;
}

function requestMatchesDateRange(
  request: any,
  dateFrom: string,
  dateTo: string,
) {
  if (!dateFrom && !dateTo) return true;

  const from = startOfLocalDate(dateFrom);
  const to = endOfLocalDate(dateTo);
  const ranges =
    Array.isArray(request.schedules) && request.schedules.length > 0
      ? request.schedules.map((schedule: any) => ({
          start: new Date(schedule.startAt),
          end: new Date(schedule.endAt || schedule.startAt),
        }))
      : [
          {
            start: new Date(request.createdAt),
            end: new Date(request.createdAt),
          },
        ];

  return ranges.some(({ start, end }: { start: Date; end: Date }) => {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }
    if (from && end < from) return false;
    if (to && start > to) return false;
    return true;
  });
}

export function filterSapfRequests(
  requests: any[],
  filters: SapfRequestFilterState,
) {
  const query = normalize(filters.query);

  return requests.filter((request) => {
    if (filters.status !== "ALL" && request.status !== filters.status) {
      return false;
    }

    if (query && !searchHaystack(request).includes(query)) {
      return false;
    }

    return requestMatchesDateRange(
      request,
      filters.dateFrom,
      filters.dateTo,
    );
  });
}

export function uniqueSapfStatuses(requests: any[]) {
  return Array.from(
    new Set(requests.map((request) => request.status).filter(Boolean)),
  ).sort();
}

export function SapfRequestFilters({
  value,
  onChange,
  statuses,
  resultCount,
  totalCount,
}: {
  value: SapfRequestFilterState;
  onChange: (value: SapfRequestFilterState) => void;
  statuses: string[];
  resultCount: number;
  totalCount: number;
}) {
  const hasFilters =
    value.query || value.status !== "ALL" || value.dateFrom || value.dateTo;

  const update = (patch: Partial<SapfRequestFilterState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="sapf-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sapf-search"
              value={value.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder="Title, request no., officer, venue, department..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={value.status}
            onValueChange={(status) => update({ status })}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sapf-date-from">From</Label>
          <Input
            id="sapf-date-from"
            type="date"
            value={value.dateFrom}
            onChange={(event) => update({ dateFrom: event.target.value })}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sapf-date-to">To</Label>
          <Input
            id="sapf-date-to"
            type="date"
            value={value.dateTo}
            onChange={(event) => update({ dateTo: event.target.value })}
            className="bg-background"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(emptySapfRequestFilters)}
          disabled={!hasFilters}
          className="lg:mb-0"
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Showing {resultCount} of {totalCount} request
        {totalCount === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
