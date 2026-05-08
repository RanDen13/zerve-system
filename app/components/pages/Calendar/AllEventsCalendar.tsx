"use client";

import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import { formatSapfDateInputValue } from "@/app/components/pages/SAPF/sapfSchedule";
import { useMemo } from "react";

function requestSubtitle(request: any) {
  return [
    request.setting === "Off-Campus" ? "Off-campus" : null,
    request.organization,
    request.department,
    request.status?.replaceAll("_", " "),
  ]
    .filter(Boolean)
    .join(" - ");
}

function requestTitle(request: any) {
  return `${request.requestNumber}: ${request.title}${
    request.setting === "Off-Campus" ? " (Off-campus)" : ""
  }`;
}

function blockSubtitle(block: any, fallback: string) {
  return block.reason || fallback;
}

function blockScope(block: any) {
  return block.type === "SYSTEM_MAINTENANCE"
    ? ("MAINTENANCE" as const)
    : ("UNIVERSITY" as const);
}

function globalBlockLabel(block: any) {
  return block.type === "SYSTEM_MAINTENANCE"
    ? "System maintenance"
    : "University-wide block";
}

function venueCalendarHref(
  venueId: string,
  startAt: Date | string,
  kiosk: boolean,
) {
  return `/calendar/${venueId}?date=${formatSapfDateInputValue(startAt)}${
    kiosk ? "&kiosk=true" : ""
  }`;
}

export default function AllEventsCalendar({
  venues,
  globalBlocks,
  title = "All Venue Events",
  description = "Campus-wide view of reservations and blocked schedules.",
  initialDate,
  kiosk = false,
}: {
  venues: any[];
  globalBlocks: any[];
  title?: string;
  description?: string;
  initialDate?: string;
  kiosk?: boolean;
}) {
  const items = useMemo<VenueCalendarItem[]>(() => {
    return [
      ...venues.flatMap((venue) =>
        (venue.sapfRequests || []).flatMap((request: any) =>
          (request.schedules || []).map((schedule: any) => ({
            id: `${venue.id}-${request.id}-${schedule.id}`,
            title: `${venue.name} - ${requestTitle(request)}`,
            subtitle: requestSubtitle(request),
            startAt: schedule.startAt,
            endAt: schedule.endAt,
            status:
              request.status === "APPROVED"
                ? ("BOOKED" as const)
                : ("PENDING" as const),
            scope:
              request.setting === "Off-Campus"
                ? ("OFF_CAMPUS" as const)
                : ("VENUE" as const),
            href: venueCalendarHref(venue.id, schedule.startAt, kiosk),
          })),
        ),
      ),
      ...venues.flatMap((venue) =>
        (venue.venueBlocks || []).flatMap((block: any) =>
          (block.schedules || []).map((schedule: any) => ({
            id: `${venue.id}-${block.id}-${schedule.id}`,
            title: `${venue.name} - ${block.title}`,
            subtitle: blockSubtitle(block, "Venue block"),
            startAt: schedule.startAt,
            endAt: schedule.endAt,
            status: "BLOCKED" as const,
            scope: "VENUE" as const,
            href: venueCalendarHref(venue.id, schedule.startAt, kiosk),
          })),
        ),
      ),
      ...(globalBlocks || []).flatMap((block: any) =>
        (block.schedules || []).map((schedule: any) => ({
          id: `global-${block.id}-${schedule.id}`,
          title: `All venues - ${block.title}`,
          subtitle: blockSubtitle(block, globalBlockLabel(block)),
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          status: "BLOCKED" as const,
          scope: blockScope(block),
        })),
      ),
    ].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [globalBlocks, kiosk, venues]);

  return (
    <VenueMonthCalendar
      key={initialDate || "all-events-month"}
      items={items}
      title={title}
      description={description}
      initialDate={initialDate}
      kiosk={kiosk}
    />
  );
}
