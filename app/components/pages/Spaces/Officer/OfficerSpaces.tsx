"use client";

import EventSpaceCard from "@/app/components/EventSpace/EventSpaceCard";
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
  MotionPage,
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
    const matchesSearch = space.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCapacity = filterCapacity
      ? space.capacity >= parseInt(filterCapacity)
      : true;
    return matchesSearch && matchesCapacity;
  });

  return (
    <MotionPage className="space-y-8 p-4 lg:p-8">
      <MotionSection>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Browse Venues
            </h1>
            <p className="mt-2 text-muted-foreground">
              {canCreateBooking
                ? "Open a venue to review details, check the calendar, and start a reservation."
                : "Open a venue to review details, check the calendar, and compare availability."}
            </p>
          </div>
          {canCreateBooking && (
            <Button asChild data-tour="spaces-create-booking">
              <Link href="/user/bookings/create">
                <Send className="mr-2 h-4 w-4" />
                Create Booking
              </Link>
            </Button>
          )}
        </div>
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
        <MotionSection className="py-12 text-center">
          <Building2 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            No venues found
          </h3>
          <p className="text-muted-foreground">Try adjusting your filters.</p>
        </MotionSection>
      )}
    </MotionPage>
  );
}
