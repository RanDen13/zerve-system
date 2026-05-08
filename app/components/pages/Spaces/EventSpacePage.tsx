"use client";

import VenueImageCarousel from "@/app/components/EventSpace/VenueImageCarousel";
import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { PageHeader, PageShell, StatCard, StatusBadge } from "@/app/components/UX";
import { Button } from "@/app/components/ui/button";
import {
  MotionItem,
  MotionList,
  MotionSection,
} from "@/app/components/ui/motion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ArrowLeft, Calendar, CheckCircle, MapPin, Send, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getEventSpaceById } from "./EventSpaceActions";
import EventSpaceSkeleton from "./EventSpaceSkeleton";
import { EventSpaceData } from "./schema";

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";

const EventSpacePage = ({
  id,
  userRole,
}: {
  id: string;
  userRole?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [eventSpace, setEventSpace] = useState<EventSpaceData | null>(null);
  const statusPopup = usePopup();
  const router = useRouter();
  const normalizedRole = userRole as AppRole | undefined;
  const canCreateReservation = normalizedRole === "OFFICER";

  const globalBlockScope = (block: any) =>
    block.type === "SYSTEM_MAINTENANCE"
      ? ("MAINTENANCE" as const)
      : ("UNIVERSITY" as const);

  useEffect(() => {
    let cancelled = false;

    const loadEventSpace = async () => {
      const spaceResult = await getEventSpaceById(id);
      if (cancelled) return;

      if (!spaceResult.success) {
        statusPopup.showError(spaceResult.message || "Failed to fetch venue.");
        setLoading(false);
        return;
      }

      setEventSpace(spaceResult.data || null);
      setLoading(false);
    };

    void loadEventSpace();

    return () => {
      cancelled = true;
    };
  }, [id, statusPopup]);

  const calendarItems = useMemo<VenueCalendarItem[]>(() => {
    if (!eventSpace) return [];
    const requestTitle = (request: any) =>
      `${request.requestNumber} - ${request.title}${
        request.setting === "Off-Campus" ? " (Off-campus)" : ""
      }`;

    return [
      ...(eventSpace.sapfRequests || []).flatMap((request) =>
        (request.schedules || []).map((schedule: any) => ({
          id: schedule.id,
          title: requestTitle(request),
          subtitle: [
            request.setting === "Off-Campus" ? "Off-campus" : null,
            request.organization,
          ]
            .filter(Boolean)
            .join(" - "),
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
        })),
      ),
      ...(eventSpace.venueBlocks || []).flatMap((block) =>
        (block.schedules || []).map((schedule: any) => ({
          id: schedule.id,
          title: block.title,
          subtitle: block.reason || "Venue block",
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          status: "BLOCKED" as const,
          scope: "VENUE" as const,
        })),
      ),
      ...(eventSpace.globalBlocks || []).flatMap((block) =>
        (block.schedules || []).map((schedule: any) => ({
          id: schedule.id,
          title: block.title,
          subtitle:
            block.reason ||
            (block.type === "SYSTEM_MAINTENANCE"
              ? "System maintenance"
              : "University-wide block"),
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          status: "BLOCKED" as const,
          scope: globalBlockScope(block),
        })),
      ),
    ].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [eventSpace]);

  const imageUrls = useMemo(() => {
    if (!eventSpace) return [];
    if (eventSpace.images?.length) {
      return eventSpace.images.map(
        (image) =>
          `data:image/jpeg;base64,${Buffer.from(image.data).toString("base64")}`,
      );
    }
    if (eventSpace.image) {
      return [
        `data:image/jpeg;base64,${Buffer.from(eventSpace.image).toString("base64")}`,
      ];
    }
    return [];
  }, [eventSpace]);

  if (loading) return <EventSpaceSkeleton />;
  if (!eventSpace) {
    return (
      <ErrorPopup message="Venue not found." onClose={() => router.back()} />
    );
  }

  return (
    <PageShell>
      <MotionSection>
        <PageHeader
          title={eventSpace.name}
          description={eventSpace.description}
          actions={
            <>
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {canCreateReservation && eventSpace.status === "ACTIVE" && (
                <Button asChild>
                  <Link href={`/user/bookings/create?venueId=${eventSpace.id}`}>
                    <Send className="mr-2 h-4 w-4" />
                    Create Booking
                  </Link>
                </Button>
              )}
            </>
          }
        />
      </MotionSection>

      <MotionSection>
        <VenueImageCarousel
          images={imageUrls}
          alt={eventSpace.name}
          className="h-80 sm:h-96 lg:h-[32rem]"
        />
      </MotionSection>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-2 md:w-90">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <MotionList className="grid gap-4 md:grid-cols-4">
            <MotionItem>
              <StatCard
                label="Location"
                value={eventSpace.location}
                valueClassName="text-base"
                icon={<MapPin className="h-5 w-5" />}
                tone="info"
              />
            </MotionItem>
            <MotionItem>
              <StatCard
                label="Capacity"
                value={`${eventSpace.capacity} people`}
                icon={<Users className="h-5 w-5" />}
                tone="success"
              />
            </MotionItem>
            <MotionItem>
              <StatCard
                label="Status"
                value={<StatusBadge status={eventSpace.status} />}
                valueClassName="text-base"
                icon={<CheckCircle className="h-5 w-5" />}
                tone={eventSpace.status === "ACTIVE" ? "success" : "warning"}
              />
            </MotionItem>
            <MotionItem>
              <StatCard
                label="Booking"
                value={
                  Number((eventSpace as any).bookingAdvanceDays ?? 30) > 0
                    ? `${(eventSpace as any).bookingAdvanceDays ?? 30} days advance`
                    : "Immediate"
                }
                valueClassName="text-base"
                icon={<Calendar className="h-5 w-5" />}
                tone="info"
              />
            </MotionItem>
          </MotionList>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <VenueMonthCalendar
            items={calendarItems}
            title={`${eventSpace.name} calendar`}
            description="Pending requests are soft holds; booked reservations and blocks reserve dates."
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default EventSpacePage;
