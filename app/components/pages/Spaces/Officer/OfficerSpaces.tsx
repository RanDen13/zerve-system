"use client";

import EventSpaceCard from "@/app/components/EventSpace/EventSpaceCard";
import { EmptyState, PageHeader, PageShell } from "@/app/components/UX";
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
  MotionItem,
  MotionList,
  MotionSection,
} from "@/app/components/ui/motion";
import { Building2, Search, Send, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EventSpaceData } from "../schema";
import UniversityWideBlocks from "../UniversityWideBlocks";

export default function OfficerSpaces({
  eventSpaces,
  globalBlocks = [],
  canCreateBooking = false,
}: {
  eventSpaces: EventSpaceData[];
  globalBlocks?: any[];
  canCreateBooking?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");

  const filteredSpaces = eventSpaces.filter((space) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch = normalizedSearch
      ? [space.name, space.location, space.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      : true;
    const requestedCapacity = Number(filterCapacity);
    const matchesCapacity =
      filterCapacity && Number.isFinite(requestedCapacity)
        ? space.capacity >= requestedCapacity
      : true;
    return matchesSearch && matchesCapacity;
  });

  return (
    <PageShell>
      <MotionSection>
        <PageHeader
          title="Browse Venues"
          description={
            canCreateBooking
              ? "Open a venue to review details, check the calendar, and start a reservation."
              : "Open a venue to review details, check the calendar, and compare availability."
          }
          actions={
            canCreateBooking ? (
              <Button asChild data-tour="spaces-create-booking">
                <Link href="/user/bookings/create">
                  <Send className="mr-2 h-4 w-4" />
                  Create Booking
                </Link>
              </Button>
            ) : null
          }
        />
      </MotionSection>

      <MotionSection data-tour="spaces-search">
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
                <Label htmlFor="search">Search by name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="e.g., Auditorium"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Minimum capacity</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="e.g., 50"
                    value={filterCapacity}
                    onChange={(event) => setFilterCapacity(event.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionSection>

      <MotionSection data-tour="spaces-blocks">
        <UniversityWideBlocks blocks={globalBlocks} />
      </MotionSection>

      <MotionSection className="text-muted-foreground">
        Showing <span className="font-semibold">{filteredSpaces.length}</span>{" "}
        of {eventSpaces.length} venues
      </MotionSection>

      <MotionList className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredSpaces.map((space) => (
          <MotionItem key={space.id}>
            <EventSpaceCard eventSpace={space} />
          </MotionItem>
        ))}
      </MotionList>

      {filteredSpaces.length === 0 && (
        <MotionSection>
          <EmptyState
            title="No venues found"
            description="Try adjusting your search or capacity filter."
            icon={<Building2 className="h-6 w-6" />}
          />
        </MotionSection>
      )}
    </PageShell>
  );
}
