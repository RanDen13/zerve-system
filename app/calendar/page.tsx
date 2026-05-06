import VenueCalendarView from "@/app/components/pages/Calendar/VenueCalendarView";
import { auth } from "@/lib/auth";
import { getVenueCalendarData } from "@/lib/venue-calendar-data";
import { headers } from "next/headers";
import Image from "next/image";

const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ kiosk?: string }>;
}) => {
  const { kiosk } = await searchParams;
  const isKiosk = kiosk === "true";
  const [session, calendarData] = await Promise.all([
    auth.api.getSession({
      headers: await headers(),
    }),
    getVenueCalendarData(),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-[26rem] overflow-hidden">
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
      <div className="relative p-4 lg:p-8">
        <VenueCalendarView
          venues={calendarData.venues}
          globalBlocks={calendarData.globalBlocks}
          actionHref={!isKiosk ? (session?.user ? "/user/dashboard" : "/login") : undefined}
          actionLabel={!isKiosk ? (session?.user ? "Go to dashboard" : "Login") : undefined}
          backHref={!isKiosk ? "/" : undefined}
          backLabel="Back"
          kiosk={isKiosk}
        />
      </div>
    </main>
  );
};

export default page;
