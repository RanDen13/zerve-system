"use client";

import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import { useMemo } from "react";

function requestSubtitle(request: any) {
  return [
    request.organization,
    request.department,
    request.status?.replaceAll("_", " "),
  ]
    .filter(Boolean)
    .join(" • ");
}

function blockSubtitle(block: any, fallback: string) {
  return block.reason || fallback;
}

export default function AllEventsCalendar({
  venues,
  globalBlocks,
  title = "All Venue Events",
  description = "Campus-wide view of reservations and blocked schedules.",
}: {
  venues: any[];
  globalBlocks: any[];
  title?: string;
  description?: string;
}) {
  const items = useMemo<VenueCalendarItem[]>(() => {
    return [
      ...venues.flatMap((venue) =>
        (venue.sapfRequests || []).flatMap((request: any) =>
          (request.schedules || []).map((schedule: any) => ({
            id: `${venue.id}-${request.id}-${schedule.id}`,
            title: `${venue.name} - ${request.requestNumber}: ${request.title}`,
            subtitle: requestSubtitle(request),
            startAt: schedule.startAt,
            endAt: schedule.endAt,
            status:
              request.status === "APPROVED"
                ? ("BOOKED" as const)
                : ("PENDING" as const),
            scope: "VENUE" as const,
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
          })),
        ),
      ),
      ...(globalBlocks || []).flatMap((block: any) =>
        (block.schedules || []).map((schedule: any) => ({
          id: `global-${block.id}-${schedule.id}`,
          title: `All venues - ${block.title}`,
          subtitle: blockSubtitle(block, "University-wide block"),
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          status: "BLOCKED" as const,
          scope: "UNIVERSITY" as const,
        })),
      ),
    ].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [globalBlocks, venues]);

  return (
    <VenueMonthCalendar
      items={items}
      title={title}
      description={description}
    />
  );
}
