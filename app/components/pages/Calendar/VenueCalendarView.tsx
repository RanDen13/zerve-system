"use client";

import EventSpaceCard from "@/app/components/EventSpace/EventSpaceCard";
import { ModeToggle } from "@/app/components/mode-toggle";
import AllEventsCalendar from "@/app/components/pages/Calendar/AllEventsCalendar";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatSapfDateForMessage,
  formatSapfDateInputValue,
  formatSapfTime,
} from "@/app/components/pages/SAPF/sapfSchedule";

type LegendPanel =
  | "pending"
  | "booked"
  | "offCampus"
  | "venueBlocks"
  | "universityWide"
  | "maintenance";

type LegendListItem = {
  id: string;
  title: string;
  venueName: string;
  date: string;
  time: string;
  href: string;
  startAt: string | Date;
};

const legendPanels: Array<{
  key: LegendPanel;
  label: string;
  dotClassName: string;
  cardClassName: string;
}> = [
  {
    key: "pending",
    label: "Pending",
    dotClassName: "bg-amber-500",
    cardClassName: "border-amber-300/45 bg-amber-500/15",
  },
  {
    key: "booked",
    label: "Booked Reservations",
    dotClassName: "bg-emerald-500",
    cardClassName: "border-emerald-300/45 bg-emerald-500/15",
  },
  {
    key: "offCampus",
    label: "Off-campus",
    dotClassName: "bg-sky-300",
    cardClassName: "border-sky-200/50 bg-sky-400/15",
  },
  {
    key: "venueBlocks",
    label: "Venue Blocks",
    dotClassName: "bg-red-500",
    cardClassName: "border-red-300/45 bg-red-500/15",
  },
  {
    key: "universityWide",
    label: "University-wide",
    dotClassName: "bg-violet-500",
    cardClassName: "border-violet-300/45 bg-violet-500/15",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    dotClassName: "bg-yellow-500",
    cardClassName: "border-yellow-300/45 bg-yellow-500/15",
  },
];

export default function VenueCalendarView({
  venues,
  globalBlocks,
  title = "Public Venue Calendar",
  description = "Browse campus venues and open a venue to check its calendar.",
  actionHref,
  actionLabel,
  backHref,
  backLabel = "Back",
  kiosk = false,
  initialDate,
}: {
  venues: any[];
  globalBlocks: any[];
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  backHref?: string;
  backLabel?: string;
  kiosk?: boolean;
  initialDate?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [activeTab, setActiveTab] = useState("calendar");
  const [activeLegendPanel, setActiveLegendPanel] =
    useState<LegendPanel>("pending");

  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCapacity = filterCapacity
        ? venue.capacity >= Number(filterCapacity)
        : true;
      return matchesSearch && matchesCapacity;
    });
  }, [filterCapacity, searchQuery, venues]);
  const legendLists = useMemo<Record<LegendPanel, LegendListItem[]>>(() => {
    const lists: Record<LegendPanel, LegendListItem[]> = {
      pending: [],
      booked: [],
      offCampus: [],
      venueBlocks: [],
      universityWide: [],
      maintenance: [],
    };

    venues.forEach((venue) => {
      (venue.sapfRequests || []).forEach((request: any) => {
        (request.schedules || []).forEach((schedule: any) => {
          const item: LegendListItem = {
            id: `${request.id}-${schedule.id}`,
            title: `${request.requestNumber}: ${request.title}`,
            venueName: venue.name,
            date: formatSapfDateForMessage(schedule.startAt),
            time: `${formatSapfTime(schedule.startAt)} - ${formatSapfTime(
              schedule.endAt,
            )}`,
            href: `/calendar/${venue.id}?date=${formatSapfDateInputValue(
              schedule.startAt,
            )}${kiosk ? "&kiosk=true" : ""}#calendar-view`,
            startAt: schedule.startAt,
          };
          const isOffCampus =
            String(request.setting || "").toLowerCase() === "off-campus";

          if (isOffCampus) {
            lists.offCampus.push(item);
          } else if (request.status === "APPROVED") {
            lists.booked.push(item);
          } else {
            lists.pending.push(item);
          }
        });
      });

      (venue.venueBlocks || []).forEach((block: any) => {
        (block.schedules || []).forEach((schedule: any) => {
          lists.venueBlocks.push({
            id: `${block.id}-${schedule.id}`,
            title: block.title,
            venueName: venue.name,
            date: formatSapfDateForMessage(schedule.startAt),
            time: `${formatSapfTime(schedule.startAt)} - ${formatSapfTime(
              schedule.endAt,
            )}`,
            href: `/calendar/${venue.id}?date=${formatSapfDateInputValue(
              schedule.startAt,
            )}${kiosk ? "&kiosk=true" : ""}#calendar-view`,
            startAt: schedule.startAt,
          });
        });
      });
    });

    (globalBlocks || []).forEach((block: any) => {
      (block.schedules || []).forEach((schedule: any) => {
        const key =
          block.type === "SYSTEM_MAINTENANCE"
            ? "maintenance"
            : "universityWide";
        lists[key].push({
          id: `global-${block.id}-${schedule.id}`,
          title: block.title,
          venueName:
            block.type === "SYSTEM_MAINTENANCE"
              ? "System maintenance"
              : "University-wide block",
          date: formatSapfDateForMessage(schedule.startAt),
          time: `${formatSapfTime(schedule.startAt)} - ${formatSapfTime(
            schedule.endAt,
          )}`,
          href: `/calendar?date=${formatSapfDateInputValue(schedule.startAt)}${
            kiosk ? "&kiosk=true" : ""
          }#calendar-view`,
          startAt: schedule.startAt,
        });
      });
    });

    legendPanels.forEach((panel) => {
      lists[panel.key].sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );
    });

    return lists;
  }, [globalBlocks, kiosk, venues]);

  const selectedLegendPanel = legendPanels.find(
    (panel) => panel.key === activeLegendPanel,
  )!;
  const selectedLegendItems = legendLists[activeLegendPanel];

  const openLegendPanel = (panel: LegendPanel) => {
    setActiveLegendPanel(panel);
    setActiveTab("calendar");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-lg border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-md lg:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <CalendarDays className="h-3.5 w-3.5" />
              Zerve Calendar
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!kiosk && backHref && (
              <Button
                asChild
                variant="outline"
                className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backLabel}
                </Link>
              </Button>
            )}
            {!kiosk && actionHref && actionLabel && (
              <Button
                asChild
                variant="outline"
                className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={actionHref}>{actionLabel}</Link>
              </Button>
            )}
            <div className="text-foreground">
              <ModeToggle />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {legendPanels.map((panel) => (
            <button
              key={panel.key}
              type="button"
              onClick={() => openLegendPanel(panel.key)}
              className={`rounded-md border p-3 text-left text-white transition hover:bg-white/15 ${
                panel.cardClassName
              } ${
                activeLegendPanel === panel.key
                  ? "ring-2 ring-white/70"
                  : "ring-0"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${panel.dotClassName}`}
                />
                <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-white/75">
                  {panel.label}
                </p>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {legendLists[panel.key].length}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-md border border-white/15 bg-white/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedLegendPanel.dotClassName}`}
              />
              <p className="truncate text-sm font-semibold">
                {selectedLegendPanel.label}
              </p>
            </div>
            <p className="shrink-0 text-xs text-white/65">
              {selectedLegendItems.length} date
              {selectedLegendItems.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="max-h-56 overflow-y-auto pr-1">
            {selectedLegendItems.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {selectedLegendItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="rounded-md border border-white/15 bg-black/15 p-3 text-sm transition hover:bg-white/15"
                  >
                    <span className="block truncate font-semibold">
                      {item.title}
                    </span>
                    <span className="block text-xs text-white/70">
                      {item.venueName} - {item.date} - {item.time}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">
                No {selectedLegendPanel.label.toLowerCase()} dates.
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[320px]">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
        </TabsList>

        <TabsContent id="calendar-view" value="calendar" className="space-y-6">
          <AllEventsCalendar
            venues={venues}
            globalBlocks={globalBlocks}
            title="All Venue Events"
            description="Reservations and blocks across every venue."
            initialDate={initialDate}
          />
        </TabsContent>

        <TabsContent value="venues" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>
                Find venues that match your activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calendar-search">
                    Search by venue or location
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="calendar-search"
                      placeholder="e.g., Auditorium"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-capacity">Minimum capacity</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="calendar-capacity"
                      type="number"
                      placeholder="e.g., 50"
                      value={filterCapacity}
                      onChange={(event) =>
                        setFilterCapacity(event.target.value)
                      }
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground">
            Showing{" "}
            <span className="font-semibold">{filteredVenues.length}</span> of{" "}
            {venues.length} venues
          </p>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVenues.map((venue) => (
              <EventSpaceCard
                key={venue.id}
                eventSpace={venue}
                detailsHref={`/calendar/${venue.id}${kiosk ? "?kiosk=true" : ""}`}
              />
            ))}
          </div>

          {filteredVenues.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                No venues found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your filters.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
