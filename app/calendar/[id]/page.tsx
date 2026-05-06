import VenueImageCarousel from "@/app/components/EventSpace/VenueImageCarousel";
import { ModeToggle } from "@/app/components/mode-toggle";
import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { getVenueCalendarData } from "@/lib/venue-calendar-data";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

function calendarItems(venue: any, globalBlocks: any[]): VenueCalendarItem[] {
  return [
    ...(venue.sapfRequests || []).flatMap((request: any) =>
      (request.schedules || []).map((schedule: any) => ({
        id: schedule.id,
        title: `${request.requestNumber} - ${request.title}`,
        subtitle: [
          request.organization,
          request.department,
          request.status?.replaceAll("_", " "),
        ]
          .filter(Boolean)
          .join(" • "),
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        status:
          request.status === "APPROVED"
            ? ("BOOKED" as const)
            : ("PENDING" as const),
        scope: "VENUE" as const,
      })),
    ),
    ...(venue.venueBlocks || []).flatMap((block: any) =>
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
    ...(globalBlocks || []).flatMap((block: any) =>
      (block.schedules || []).map((schedule: any) => ({
        id: schedule.id,
        title: block.title,
        subtitle: block.reason || "University-wide block",
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        status: "BLOCKED" as const,
        scope: "UNIVERSITY" as const,
      })),
    ),
  ].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

const page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kiosk?: string }>;
}) => {
  const { id } = await params;
  const { kiosk } = await searchParams;
  const isKiosk = kiosk === "true";
  const { venues, globalBlocks } = await getVenueCalendarData();
  const venue = venues.find((item) => item.id === id);

  if (!venue) {
    notFound();
  }

  const imagesFromImagesData = venue.imagesData || [];
  const fallbackImage = venue.image
    ? `data:image/jpeg;base64,${Buffer.from(venue.image).toString("base64")}`
    : null;
  const images = imagesFromImagesData.length
    ? imagesFromImagesData
    : fallbackImage
      ? [fallbackImage]
      : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-[24rem] overflow-hidden">
        <Image
          src="/lcupBg.png"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
      </div>
      <div className="relative mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href={isKiosk ? "/calendar?kiosk=true" : "/calendar"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to venues
            </Link>
          </Button>
          {!isKiosk && (
            <Button
              asChild
              variant="outline"
              className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/">Home</Link>
            </Button>
          )}
          <div className="text-foreground">
            <ModeToggle />
          </div>
        </div>

        <VenueImageCarousel
          images={images}
          alt={venue.name}
          className="h-80 sm:h-96 lg:h-[32rem]"
        />

        <div>
          <h1 className="text-3xl font-bold text-foreground">{venue.name}</h1>
          <p className="mt-2 text-muted-foreground">{venue.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{venue.location}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Users className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-semibold">{venue.capacity} people</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <VenueMonthCalendar
          items={calendarItems(venue, globalBlocks)}
          title={`${venue.name} calendar`}
          description="Pending requests are soft holds; booked reservations and blocks reserve dates."
        />
      </div>
    </main>
  );
};

export default page;
