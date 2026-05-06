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
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");

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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/15 bg-white/10 p-3">
            <p className="text-2xl font-bold">{venues.length}</p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Venues
            </p>
          </div>
          <div className="rounded-md border border-white/15 bg-white/10 p-3">
            <p className="text-2xl font-bold">
              {venues.reduce(
                (count, venue) => count + (venue.sapfRequests?.length || 0),
                0,
              )}
            </p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Reservations
            </p>
          </div>
          <div className="rounded-md border border-white/15 bg-white/10 p-3">
            <p className="text-2xl font-bold">
              {venues.reduce(
                (count, venue) => count + (venue.venueBlocks?.length || 0),
                globalBlocks.length,
              )}
            </p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Blocks
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[320px]">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <AllEventsCalendar
            venues={venues}
            globalBlocks={globalBlocks}
            title="All Venue Events"
            description="Reservations and blocks across every venue."
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
