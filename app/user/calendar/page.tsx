import AllEventsCalendar from "@/app/components/pages/Calendar/AllEventsCalendar";
import { getVenueCalendarData } from "@/lib/venue-calendar-data";

const page = async () => {
  const { venues, globalBlocks } = await getVenueCalendarData();

  return (
    <div className="p-4 lg:p-8" data-tour="calendar-main">
      <AllEventsCalendar
        venues={venues}
        globalBlocks={globalBlocks}
        title="Calendar"
        description="All reservations and blocks across venues."
      />
    </div>
  );
};

export default page;
