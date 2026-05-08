"use client";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { sapfCalendarDate } from "@/app/components/pages/SAPF/sapfSchedule";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Clock,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type VenueCalendarItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  status: "PENDING" | "BOOKED" | "APPROVED" | "BLOCKED";
  operationalStatus?: string | null;
  scope?: "VENUE" | "UNIVERSITY" | "MAINTENANCE" | "OFF_CAMPUS";
  href?: string;
};

type NormalizedCalendarItem = Omit<VenueCalendarItem, "startAt" | "endAt"> & {
  startAt: Date;
  endAt: Date;
};

type CalendarView = "month" | "day";
type CalendarWeatherDay = {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number | null;
  precipitationSum: number | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOUR_HEIGHT = 72;

function weatherDateKey(day: Date) {
  return format(day, "yyyy-MM-dd");
}

function weatherSummary(code: number | null) {
  if (code === null || code === undefined) return "Forecast";
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Forecast";
}

function WeatherIcon({
  code,
  className,
}: {
  code: number | null;
  className?: string;
}) {
  if (code === 0) return <Sun className={className} />;
  if ([1, 2].includes(code ?? -1)) return <CloudSun className={className} />;
  if (code === 3) return <Cloud className={className} />;
  if ([45, 48].includes(code ?? -1)) return <CloudFog className={className} />;
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) {
    return <CloudDrizzle className={className} />;
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
    return <CloudRain className={className} />;
  }
  if ([95, 96, 99].includes(code ?? -1)) {
    return <CloudLightning className={className} />;
  }
  return <CloudSun className={className} />;
}

function temperatureLabel(weather?: CalendarWeatherDay) {
  if (!weather) return "";
  const max =
    typeof weather.temperatureMax === "number"
      ? `${Math.round(weather.temperatureMax)}`
      : "";
  const min =
    typeof weather.temperatureMin === "number"
      ? `${Math.round(weather.temperatureMin)}`
      : "";
  if (max && min) return `${min}-${max} C`;
  if (max) return `${max} C`;
  if (min) return `${min} C`;
  return "";
}

function rainLabel(weather?: CalendarWeatherDay) {
  if (!weather) return "";
  if (typeof weather.precipitationProbability === "number") {
    return `${Math.round(weather.precipitationProbability)}% rain`;
  }
  if (typeof weather.precipitationSum === "number") {
    return `${weather.precipitationSum.toFixed(1)} mm`;
  }
  return "";
}

function statusClass(
  item: Pick<VenueCalendarItem, "status" | "scope" | "operationalStatus">,
) {
  if (item.scope === "OFF_CAMPUS") {
    return "border-sky-400/40 bg-sky-300/25 text-sky-800 dark:border-sky-300/30 dark:bg-sky-300/15 dark:text-sky-200";
  }
  if (item.scope === "UNIVERSITY") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200";
  }
  if (item.scope === "MAINTENANCE") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200";
  }
  if (item.operationalStatus === "ONGOING") {
    return "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-200";
  }
  if (item.operationalStatus === "COMPLETED") {
    return "border-muted bg-muted/50 text-muted-foreground";
  }
  if (item.status === "APPROVED" || item.status === "BOOKED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  }
  if (item.status === "BLOCKED") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200";
}

function statusDotClass(
  item: Pick<VenueCalendarItem, "status" | "scope" | "operationalStatus">,
) {
  if (item.scope === "OFF_CAMPUS") return "bg-sky-300";
  if (item.scope === "UNIVERSITY") return "bg-violet-500";
  if (item.scope === "MAINTENANCE") return "bg-yellow-500";
  if (item.operationalStatus === "ONGOING") return "bg-sky-500";
  if (item.operationalStatus === "COMPLETED") return "bg-muted-foreground";
  if (item.status === "APPROVED" || item.status === "BOOKED") {
    return "bg-emerald-500";
  }
  if (item.status === "BLOCKED") return "bg-red-500";
  return "bg-amber-500";
}

function asDate(value: Date | string) {
  return sapfCalendarDate(value);
}

function itemTouchesDay(item: Pick<NormalizedCalendarItem, "startAt" | "endAt">, day: Date) {
  return item.startAt <= endOfDay(day) && item.endAt >= startOfDay(day);
}

function itemTimeLabel(item: Pick<NormalizedCalendarItem, "startAt" | "endAt">) {
  if (isSameDay(item.startAt, item.endAt)) {
    return `${format(item.startAt, "h:mm a")} - ${format(item.endAt, "h:mm a")}`;
  }

  return `${format(item.startAt, "MMM d, h:mm a")} - ${format(
    item.endAt,
    "MMM d, h:mm a",
  )}`;
}

function clampDate(value: Date, min: Date, max: Date) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function splitIntoWeeks(days: Date[]) {
  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

export default function VenueMonthCalendar({
  items,
  title = "Venue Calendar",
  description = "Month view of pending, booked, and blocked dates.",
  compact = false,
  initialDate,
  initialView,
  kiosk = false,
}: {
  items: VenueCalendarItem[];
  title?: string;
  description?: string;
  compact?: boolean;
  initialDate?: Date | string;
  initialView?: CalendarView;
  kiosk?: boolean;
}) {
  const router = useRouter();
  const initialDay = startOfDay(
    sapfCalendarDate(initialDate || new Date()),
  );
  const [selectedDay, setSelectedDay] = useState(() =>
    initialDay,
  );
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(initialDay),
  );
  const [calendarView, setCalendarView] = useState<CalendarView>(
    initialView || (initialDate ? "day" : "month"),
  );
  const [weatherDays, setWeatherDays] = useState<CalendarWeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const response = await fetch("/api/weather/forecast");
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) {
          setWeatherDays(Array.isArray(payload.days) ? payload.days : []);
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const weeks = useMemo(() => splitIntoWeeks(calendarDays), [calendarDays]);

  const monthItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          startAt: asDate(item.startAt),
          endAt: asDate(item.endAt),
        }))
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
    [items],
  );

  const visibleMonthItems = monthItems.filter(
    (item) => item.startAt <= endOfMonth(visibleMonth) && item.endAt >= startOfMonth(visibleMonth),
  );

  const selectedDayItems = monthItems.filter((item) =>
    itemTouchesDay(item, selectedDay),
  );
  const weatherByDate = useMemo(
    () =>
      new Map(
        weatherDays.map((weather) => [weather.date, weather] as const),
      ),
    [weatherDays],
  );
  const selectedWeather = weatherByDate.get(weatherDateKey(selectedDay));
  const quickJumpDays = useMemo(
    () => [
      { key: "today", label: "Today", date: startOfDay(sapfCalendarDate(new Date())) },
      { key: "tomorrow", label: "Tomorrow", date: startOfDay(addDays(sapfCalendarDate(new Date()), 1)) },
      { key: "week", label: "Start of week", date: startOfDay(startOfWeek(sapfCalendarDate(new Date()))) },
    ],
    [],
  );

  const goPrevious = () => {
    if (calendarView === "day") {
      const nextDay = subDays(selectedDay, 1);
      setSelectedDay(nextDay);
      setVisibleMonth(startOfMonth(nextDay));
      return;
    }

    setVisibleMonth((month) => subMonths(month, 1));
  };

  const goNext = () => {
    if (calendarView === "day") {
      const nextDay = addDays(selectedDay, 1);
      setSelectedDay(nextDay);
      setVisibleMonth(startOfMonth(nextDay));
      return;
    }

    setVisibleMonth((month) => addMonths(month, 1));
  };

  const goToday = () => {
    const today = startOfDay(sapfCalendarDate(new Date()));
    setSelectedDay(today);
    setVisibleMonth(startOfMonth(today));
  };

  const selectCalendarDay = (day: Date, nextView: CalendarView = calendarView) => {
    setSelectedDay(startOfDay(day));
    setVisibleMonth(startOfMonth(day));
    setCalendarView(nextView);
  };
  const openCalendarItem = (item: NormalizedCalendarItem) => {
    if (item.href) {
      router.push(item.href);
      return;
    }
    selectCalendarDay(item.startAt, "day");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
      className="overflow-hidden rounded-lg border bg-card/95 shadow-sm backdrop-blur"
    >
      <div
        className={`flex flex-col gap-4 border-b xl:flex-row xl:items-center xl:justify-between ${
          kiosk ? "p-5 lg:p-6" : "p-4"
        }`}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div
            className={`shrink-0 rounded-lg border bg-card shadow-xs ${
              kiosk
                ? "flex h-16 w-16 flex-col items-center justify-center"
                : "flex h-14 w-14 flex-col items-center justify-center"
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              {format(selectedDay, "MMM")}
            </span>
            <span className="text-xl font-bold text-violet-700">
              {format(selectedDay, "d")}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              {title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`font-bold text-foreground ${kiosk ? "text-2xl" : "text-xl"}`}>
                {calendarView === "month"
                  ? format(visibleMonth, "MMMM yyyy")
                  : format(selectedDay, "MMMM d, yyyy")}
              </h3>
              <Badge variant="outline" className={kiosk ? "text-sm" : ""}>
                {calendarView === "month" ? "Month" : format(selectedDay, "EEEE")}
              </Badge>
            </div>
            <p className={`${kiosk ? "text-base" : "text-sm"} text-muted-foreground`}>
              {calendarView === "month"
                ? description
                : `${selectedDayItems.length} item${
                    selectedDayItems.length === 1 ? "" : "s"
                  } scheduled for this day.`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          {kiosk &&
            quickJumpDays.map((quickDay) => (
              <Button
                key={quickDay.key}
                type="button"
                variant="outline"
                className="h-11 w-full px-4 text-sm font-semibold sm:w-auto"
                onClick={() => selectCalendarDay(quickDay.date)}
              >
                {quickDay.label}
              </Button>
            ))}
          {selectedWeather ? (
            <div
              className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-md border bg-background shadow-xs sm:col-span-1 ${
                kiosk ? "h-11 px-4 text-base" : "h-9 px-3 text-sm"
              }`}
            >
              <WeatherIcon
                code={selectedWeather.weatherCode}
                className="h-4 w-4 text-sky-600"
              />
              <span className="font-medium">
                {weatherSummary(selectedWeather.weatherCode)}
              </span>
              <span className="text-muted-foreground">
                {temperatureLabel(selectedWeather)}
              </span>
            </div>
          ) : weatherLoading ? (
            <div
              className={`col-span-2 inline-flex items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs sm:col-span-1 ${
                kiosk ? "h-11 px-4 text-base" : "h-9 px-3 text-sm"
              }`}
            >
              Loading weather...
            </div>
          ) : null}
          <div className="col-span-2 flex overflow-hidden rounded-md border shadow-xs sm:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-none border-r sm:flex-none ${kiosk ? "h-11 px-4" : "px-3"}`}
              onClick={goPrevious}
              aria-label={
                calendarView === "month" ? "Previous month" : "Previous day"
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-none sm:flex-none ${kiosk ? "h-11 px-5 text-sm font-semibold" : "px-4"}`}
              onClick={goToday}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-none border-l sm:flex-none ${kiosk ? "h-11 px-4" : "px-3"}`}
              onClick={goNext}
              aria-label={calendarView === "month" ? "Next month" : "Next day"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={calendarView}
            onValueChange={(value) => setCalendarView(value as CalendarView)}
          >
            <SelectTrigger
              className={`w-full bg-background sm:min-w-32 ${
                kiosk ? "h-11 text-base" : "h-9"
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month view</SelectItem>
              <SelectItem value="day">Day view</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 border-b bg-muted/40 sm:flex sm:flex-wrap ${
          kiosk ? "p-4" : "p-3"
        }`}
      >
        {[
          { label: "Pending", className: "bg-amber-500" },
          { label: "Booked", className: "bg-emerald-500" },
          { label: "Off-campus", className: "bg-sky-300" },
          { label: "Venue block", className: "bg-red-500" },
          { label: "University-wide", className: "bg-violet-500" },
          { label: "Maintenance", className: "bg-yellow-500" },
        ].map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-2 font-medium text-muted-foreground ${
              kiosk ? "text-sm" : "text-xs"
            }`}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
            {item.label}
          </span>
        ))}
        <span className={`col-span-2 text-muted-foreground sm:ml-auto ${kiosk ? "text-sm" : "text-xs"}`}>
          {calendarView === "month"
            ? `${visibleMonthItems.length} item${
                visibleMonthItems.length === 1 ? "" : "s"
              } this month`
            : `${selectedDayItems.length} item${
                selectedDayItems.length === 1 ? "" : "s"
              } this day`}
        </span>
      </div>

      <AnimatePresence mode="wait">
      {calendarView === "month" ? (
        <motion.div
          key="month"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.22 }}
        >
        <MonthCalendar
          compact={compact}
          kiosk={kiosk}
          monthItems={monthItems}
          selectedDay={selectedDay}
          visibleMonth={visibleMonth}
          weeks={weeks}
          weatherByDate={weatherByDate}
          onSelectDay={(day) => selectCalendarDay(day)}
          onOpenDay={(day) => selectCalendarDay(day, "day")}
          onOpenItem={openCalendarItem}
        />
        </motion.div>
      ) : (
        <motion.div
          key="day"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22 }}
        >
        <DayCalendar
          items={monthItems}
          kiosk={kiosk}
          selectedDay={selectedDay}
          visibleMonth={visibleMonth}
          weatherByDate={weatherByDate}
          onSelectDay={(day) => selectCalendarDay(day, "day")}
          onOpenItem={openCalendarItem}
        />
        </motion.div>
      )}
      </AnimatePresence>

    </motion.div>
  );
}

function MonthCalendar({
  compact,
  kiosk,
  monthItems,
  selectedDay,
  visibleMonth,
  weeks,
  weatherByDate,
  onSelectDay,
  onOpenDay,
  onOpenItem,
}: {
  compact: boolean;
  kiosk: boolean;
  monthItems: NormalizedCalendarItem[];
  selectedDay: Date;
  visibleMonth: Date;
  weeks: Date[][];
  weatherByDate: Map<string, CalendarWeatherDay>;
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
  onOpenItem: (item: NormalizedCalendarItem) => void;
}) {
  const maxLanes = compact ? 3 : kiosk ? 3 : 4;
  const weekMinHeight = compact ? 128 : kiosk ? 196 : 164;

  return (
    <>
      <MobileMonthCalendar
        kiosk={kiosk}
        monthItems={monthItems}
        selectedDay={selectedDay}
        visibleMonth={visibleMonth}
        weeks={weeks}
        weatherByDate={weatherByDate}
        onSelectDay={onSelectDay}
        onOpenDay={onOpenDay}
        onOpenItem={onOpenItem}
      />
      <div className="hidden md:block">
      <div
        className={`grid grid-cols-7 border-b bg-muted/40 text-center font-semibold text-muted-foreground ${
          kiosk ? "text-sm" : "text-xs"
        }`}
      >
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-r py-2 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const weekSegments = monthItems
            .filter((item) => item.startAt <= endOfDay(weekEnd) && item.endAt >= startOfDay(weekStart))
            .map((item) => {
              const segmentStart = clampDate(
                startOfDay(item.startAt),
                startOfDay(weekStart),
                startOfDay(weekEnd),
              );
              const segmentEnd = clampDate(
                startOfDay(item.endAt),
                startOfDay(weekStart),
                startOfDay(weekEnd),
              );
              return {
                item,
                colStart: getDay(segmentStart) + 1,
                span: differenceInCalendarDays(segmentEnd, segmentStart) + 1,
              };
            })
            .sort((a, b) => {
              if (a.colStart !== b.colStart) return a.colStart - b.colStart;
              return b.span - a.span;
            });

          const laneEnds: number[] = [];
          const laidOut = weekSegments.map((segment) => {
            const endCol = segment.colStart + segment.span - 1;
            let lane = laneEnds.findIndex((laneEnd) => segment.colStart > laneEnd);
            if (lane === -1) {
              lane = laneEnds.length;
            }
            laneEnds[lane] = endCol;
            return { ...segment, lane };
          });
          const visibleSegments = laidOut.filter((segment) => segment.lane < maxLanes);
          const hiddenCount = laidOut.length - visibleSegments.length;

          return (
            <div
              key={weekStart.toISOString()}
              className="relative grid grid-cols-7 border-b last:border-b-0"
              style={{ minHeight: weekMinHeight }}
            >
              {week.map((day) => {
                const weather = weatherByDate.get(weatherDateKey(day));

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={cn(
                      `min-h-full border-r bg-card text-left align-top last:border-r-0 hover:bg-muted/50 ${
                        kiosk ? "p-3" : "p-2"
                      }`,
                      !isSameMonth(day, visibleMonth) &&
                        "bg-muted/25 text-muted-foreground/70",
                      isToday(day) && "bg-blue-500/10",
                      isSameDay(day, selectedDay) &&
                        "ring-2 ring-inset ring-violet-500/50",
                    )}
                    onClick={() => (kiosk ? onOpenDay(day) : onSelectDay(day))}
                    onDoubleClick={() => onOpenDay(day)}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={cn(
                          `flex min-w-6 w-fit items-center justify-center rounded-full px-1.5 font-semibold ${
                            kiosk ? "h-8 text-sm" : "h-6 text-xs"
                          }`,
                          isToday(day) && "bg-violet-600 text-white",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {weather && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                          <WeatherIcon
                            code={weather.weatherCode}
                            className="h-3 w-3"
                          />
                          {temperatureLabel(weather)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <div className="pointer-events-none absolute inset-x-0 top-9 grid grid-cols-7 gap-y-1 px-2">
                {visibleSegments.map(({ item, colStart, span, lane }) => (
                  <button
                    key={`${item.id}-${weekStart.toISOString()}`}
                    type="button"
                    className={cn(
                      `pointer-events-auto mx-1 truncate rounded-md border text-left font-semibold shadow-xs ${
                        kiosk
                          ? "h-9 px-3 text-xs leading-8"
                          : "h-7 px-2 text-[11px] leading-6"
                      }`,
                      statusClass(item),
                    )}
                    style={{
                      gridColumn: `${colStart} / span ${span}`,
                      gridRow: lane + 1,
                    }}
                    title={`${item.title} - ${itemTimeLabel(item)}`}
                    onClick={() => onOpenItem(item)}
                  >
                    <span className="truncate">
                      {item.title}
                      <span className="ml-1 font-medium">
                        {format(item.startAt, "h:mm a")}
                      </span>
                    </span>
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <span
                    className={`pointer-events-auto col-span-7 px-3 text-right font-semibold text-muted-foreground ${
                      kiosk ? "text-sm" : "text-[11px]"
                    }`}
                    style={{ gridRow: maxLanes + 1 }}
                  >
                    {hiddenCount} more...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}

function MobileMonthCalendar({
  kiosk,
  monthItems,
  selectedDay,
  visibleMonth,
  weeks,
  weatherByDate,
  onSelectDay,
  onOpenDay,
  onOpenItem,
}: {
  kiosk: boolean;
  monthItems: NormalizedCalendarItem[];
  selectedDay: Date;
  visibleMonth: Date;
  weeks: Date[][];
  weatherByDate: Map<string, CalendarWeatherDay>;
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
  onOpenItem: (item: NormalizedCalendarItem) => void;
}) {
  const monthDays = weeks.flat();
  const selectedDayItems = monthItems.filter((item) =>
    itemTouchesDay(item, selectedDay),
  );
  const selectedWeather = weatherByDate.get(weatherDateKey(selectedDay));

  return (
    <div className="md:hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40 px-1 py-2 text-center text-[11px] font-bold uppercase tracking-normal text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day.slice(0, 2)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border p-px">
        {monthDays.map((day) => {
          const dayItems = monthItems.filter((item) => itemTouchesDay(item, day));
          const visibleDots = dayItems.slice(0, 3);
          const isSelected = isSameDay(day, selectedDay);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={cn(
                "min-h-16 bg-card p-1.5 text-left transition hover:bg-muted/50",
                !isSameMonth(day, visibleMonth) &&
                  "bg-muted/35 text-muted-foreground/60",
                isToday(day) && "bg-blue-500/10",
                isSelected && "relative z-10 ring-2 ring-inset ring-violet-500",
              )}
              onClick={() => onSelectDay(day)}
              onDoubleClick={() => onOpenDay(day)}
              aria-label={`${format(day, "MMMM d")}, ${dayItems.length} item${
                dayItems.length === 1 ? "" : "s"
              }`}
            >
              <span
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold",
                  isToday(day) && "bg-violet-600 text-white",
                  isSelected && !isToday(day) && "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100",
                )}
              >
                {format(day, "d")}
              </span>
              {dayItems.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {visibleDots.map((item) => (
                    <span
                      key={`${item.id}-${weatherDateKey(day)}`}
                      className={cn("h-1.5 w-1.5 rounded-full", statusDotClass(item))}
                    />
                  ))}
                  {dayItems.length > visibleDots.length && (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      +{dayItems.length - visibleDots.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 border-t bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Selected day
            </p>
            <h4 className="text-lg font-bold text-foreground">
              {format(selectedDay, "EEEE, MMM d")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {selectedDayItems.length} item
              {selectedDayItems.length === 1 ? "" : "s"} scheduled.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size={kiosk ? "default" : "sm"}
            className="shrink-0"
            onClick={() => onOpenDay(selectedDay)}
          >
            Day view
          </Button>
        </div>

        {selectedWeather && (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-sky-500/5 p-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">
                {weatherSummary(selectedWeather.weatherCode)}
              </p>
              <p className="text-xs text-muted-foreground">
                {temperatureLabel(selectedWeather) || "Forecast"} -{" "}
                {rainLabel(selectedWeather) || "Rain unavailable"}
              </p>
            </div>
            <WeatherIcon
              code={selectedWeather.weatherCode}
              className="h-5 w-5 shrink-0 text-sky-600"
            />
          </div>
        )}

        {selectedDayItems.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
            No reservations or blocks on this day.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={cn(
                  "w-full rounded-md border p-3 text-left text-sm shadow-xs",
                  statusClass(item),
                )}
                onClick={() => onOpenItem(item)}
              >
                <span className="block font-bold">{item.title}</span>
                <span className="mt-1 block text-xs font-semibold">
                  {itemTimeLabel(item)}
                </span>
                {item.subtitle && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCalendar({
  items,
  kiosk,
  selectedDay,
  visibleMonth,
  weatherByDate,
  onSelectDay,
  onOpenItem,
}: {
  items: NormalizedCalendarItem[];
  kiosk: boolean;
  selectedDay: Date;
  visibleMonth: Date;
  weatherByDate: Map<string, CalendarWeatherDay>;
  onSelectDay: (day: Date) => void;
  onOpenItem: (item: NormalizedCalendarItem) => void;
}) {
  const minuteHeight = HOUR_HEIGHT / 60;
  const timeColumnWidth = kiosk ? 92 : 82;
  const collapsedMaxHeight = kiosk ? 132 : 108;
  const selectedDayKey = weatherDateKey(selectedDay);
  const [expandedClusterState, setExpandedClusterState] = useState<{
    dayKey: string;
    ids: Set<string>;
  }>(() => ({
    dayKey: selectedDayKey,
    ids: new Set(),
  }));
  const expandedClusterIds =
    expandedClusterState.dayKey === selectedDayKey
      ? expandedClusterState.ids
      : new Set<string>();
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, index) => DAY_START_HOUR + index,
  );
  const dayItems = items.filter((item) => itemTouchesDay(item, selectedDay));
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth)),
    end: endOfWeek(endOfMonth(visibleMonth)),
  });
  const dayStart = startOfDay(selectedDay);
  const visibleStart = new Date(dayStart);
  visibleStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const visibleEnd = new Date(dayStart);
  visibleEnd.setHours(DAY_END_HOUR, 0, 0, 0);
  const selectedWeather = weatherByDate.get(weatherDateKey(selectedDay));

  const clippedBlocks = dayItems
    .map((item) => {
      const start = clampDate(item.startAt, visibleStart, visibleEnd);
      const end = clampDate(item.endAt, visibleStart, visibleEnd);
      return { item, start, end };
    })
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const eventClusters: Array<{
    id: string;
    start: Date;
    end: Date;
    blocks: typeof clippedBlocks;
  }> = [];
  clippedBlocks.forEach((block) => {
    const activeCluster = eventClusters[eventClusters.length - 1];
    if (!activeCluster || block.start > activeCluster.end) {
      eventClusters.push({
        id: "",
        start: block.start,
        end: block.end,
        blocks: [block],
      });
      return;
    }

    if (block.end > activeCluster.end) {
      activeCluster.end = block.end;
    }
    activeCluster.blocks.push(block);
  });
  eventClusters.forEach((cluster, index) => {
    cluster.id = [
      index,
      cluster.start.getTime(),
      cluster.end.getTime(),
      cluster.blocks.map((block) => block.item.id).join("-"),
    ].join(":");
  });

  const minutesBetween = (start: Date, end: Date) =>
    Math.max(0, (end.getTime() - start.getTime()) / 60000);
  const formatTimelineTime = (date: Date) =>
    format(date, date.getMinutes() ? "h:mm a" : "h a");
  const toggleCluster = (clusterId: string) => {
    setExpandedClusterState((current) => {
      const next =
        current.dayKey === selectedDayKey
          ? new Set(current.ids)
          : new Set<string>();
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return { dayKey: selectedDayKey, ids: next };
    });
  };

  let cursorTime = visibleStart;
  let cursorTop = 0;
  const clusterLayouts = eventClusters.map((cluster) => {
    cursorTop += minutesBetween(cursorTime, cluster.start) * minuteHeight;

    const durationMinutes = Math.max(1, minutesBetween(cluster.start, cluster.end));
    const naturalHeight = Math.max(42, durationMinutes * minuteHeight);
    const compactHeight = Math.max(
      72,
      Math.min(naturalHeight, collapsedMaxHeight + cluster.blocks.length * 10),
    );
    const expanded = expandedClusterIds.has(cluster.id);
    const collapsed = !expanded && naturalHeight > compactHeight + 8;
    const height = collapsed ? compactHeight : naturalHeight;
    const layout = {
      cluster,
      top: cursorTop,
      height,
      naturalHeight,
      collapsed,
    };

    cursorTop += height;
    cursorTime = cluster.end;
    return layout;
  });
  const timelineHeight = Math.max(
    420,
    cursorTop + minutesBetween(cursorTime, visibleEnd) * minuteHeight,
  );
  const topForTime = (date: Date) => {
    let topCursor = 0;
    let timeCursor = visibleStart;

    for (const layout of clusterLayouts) {
      if (date <= layout.cluster.start) {
        return topCursor + minutesBetween(timeCursor, date) * minuteHeight;
      }

      if (date < layout.cluster.end) {
        if (!layout.collapsed) {
          return (
            layout.top +
            minutesBetween(layout.cluster.start, date) * minuteHeight
          );
        }

        const elapsed = minutesBetween(layout.cluster.start, date);
        const total = Math.max(1, minutesBetween(layout.cluster.start, layout.cluster.end));
        return layout.top + (elapsed / total) * layout.height;
      }

      topCursor = layout.top + layout.height;
      timeCursor = layout.cluster.end;
    }

    return topCursor + minutesBetween(timeCursor, date) * minuteHeight;
  };
  const hiddenTickTimes = new Set(
    clusterLayouts
      .filter((layout) => layout.collapsed)
      .flatMap((layout) =>
        hours.filter((hour) => {
          const tick = new Date(dayStart);
          tick.setHours(hour, 0, 0, 0);
          return tick > layout.cluster.start && tick < layout.cluster.end;
        }),
      ),
  );
  const timelineTicks = hours
    .map((hour) => {
      const tick = new Date(dayStart);
      tick.setHours(hour, 0, 0, 0);
      return tick;
    })
    .filter((tick) => !hiddenTickTimes.has(tick.getHours()))
    .map((tick) => ({ tick, top: topForTime(tick) }));
  const now = sapfCalendarDate(new Date());
  const showNow = isToday(selectedDay);
  const nowTop = topForTime(now);

  const renderExpandedBlocks = (
    layout: (typeof clusterLayouts)[number],
  ) => {
    const blocks = layout.cluster.blocks
      .map((block) => ({
        ...block,
        top: minutesBetween(layout.cluster.start, block.start) * minuteHeight,
        height: Math.max(38, minutesBetween(block.start, block.end) * minuteHeight),
        lane: 0,
      }))
      .sort((a, b) => a.top - b.top || b.height - a.height);
    const laneEnds: number[] = [];
    blocks.forEach((block) => {
      let lane = laneEnds.findIndex((laneEnd) => block.top >= laneEnd);
      if (lane === -1) {
        lane = laneEnds.length;
      }
      block.lane = lane;
      laneEnds[lane] = block.top + block.height;
    });
    const laneCount = Math.max(1, laneEnds.length);

    return (
      <div
        className="absolute"
        style={{
          top: layout.top,
          height: layout.height,
          left: timeColumnWidth,
          right: 0,
        }}
      >
        <button
          type="button"
          className="absolute z-20 rounded-full border bg-background/95 px-2.5 py-1 text-[11px] font-bold text-muted-foreground shadow-sm hover:text-foreground"
          style={{
            left: 12,
            top: 8,
          }}
          onClick={() => toggleCluster(layout.cluster.id)}
        >
          Collapse time
        </button>
        {blocks.map(({ item, top, height, lane }) => (
          <button
            type="button"
            key={`${item.id}-${layout.cluster.id}`}
            className={cn(
              `absolute overflow-hidden rounded-md border text-left shadow-xs ${
                kiosk ? "p-3 text-sm" : "p-2 text-xs"
              }`,
              statusClass(item),
            )}
            style={{
              top,
              height,
              left: `calc(${(lane / laneCount) * 100}% + 12px)`,
              right: `calc(${(1 - (lane + 1) / laneCount) * 100}% + 12px)`,
            }}
            title={`${item.title} - ${itemTimeLabel(item)}`}
            onClick={() => onOpenItem(item)}
          >
            <p className="truncate font-semibold">{item.title}</p>
            <p className="mt-1 truncate font-medium">{itemTimeLabel(item)}</p>
            {item.subtitle && (
              <p className="mt-1 line-clamp-2 text-muted-foreground">
                {item.subtitle}
              </p>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div
        className={`overflow-auto border-b lg:border-b-0 lg:border-r ${
          kiosk ? "max-h-[820px]" : "max-h-[720px]"
        }`}
      >
        <div className="relative min-w-0" style={{ height: timelineHeight }}>
          {timelineTicks.map(({ tick, top }) => (
            <div
              key={tick.toISOString()}
              className="absolute left-0 right-0 grid items-start"
              style={{
                top,
                gridTemplateColumns: `${timeColumnWidth}px minmax(0, 1fr)`,
              }}
            >
              <div
                className={`border-r pr-3 pt-2 text-right text-muted-foreground ${
                  kiosk ? "text-sm" : "text-xs"
                }`}
              >
                {formatTimelineTime(tick)}
              </div>
              <div className="h-px bg-border" />
            </div>
          ))}

          <div
            className="absolute bottom-0 top-0 border-r"
            style={{ left: timeColumnWidth - 1 }}
          />

          {clusterLayouts.map((layout) =>
            layout.collapsed ? (
              <button
                type="button"
                key={layout.cluster.id}
                className={cn(
                  "absolute z-10 overflow-hidden rounded-md border p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md",
                  statusClass(layout.cluster.blocks[0].item),
                )}
                style={{
                  top: layout.top,
                  height: layout.height,
                  left: timeColumnWidth + 12,
                  right: 12,
                }}
                onClick={() => toggleCluster(layout.cluster.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {layout.cluster.blocks.length === 1
                        ? layout.cluster.blocks[0].item.title
                        : `${layout.cluster.blocks.length} occupied schedules`}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {formatTimelineTime(layout.cluster.start)} -{" "}
                      {formatTimelineTime(layout.cluster.end)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      Collapsed busy time. Tap to expand this range.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border bg-background/70 px-2 py-1 text-[10px] font-bold uppercase tracking-normal">
                    Expand
                  </span>
                </div>
              </button>
            ) : (
              <div key={layout.cluster.id}>{renderExpandedBlocks(layout)}</div>
            ),
          )}

          {showNow && nowTop >= 0 && nowTop <= timelineHeight && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 grid -translate-y-1/2 items-center"
              style={{
                top: nowTop,
                gridTemplateColumns: `${timeColumnWidth}px minmax(0, 1fr)`,
              }}
            >
              <div className="flex justify-end pr-2">
                <span className="rounded-full border border-violet-500/30 bg-background px-2 py-0.5 text-[11px] font-bold text-violet-600 shadow-sm">
                  {format(now, "h:mm a")}
                </span>
              </div>
              <div className="h-px bg-violet-500" />
            </div>
          )}
        </div>
      </div>

      <aside className="bg-card">
        <div className={`border-b ${kiosk ? "p-6" : "p-5"}`}>
          <div className="mb-5 flex items-center justify-between">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">{format(visibleMonth, "MMMM yyyy")}</p>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`grid grid-cols-7 gap-y-3 text-center ${kiosk ? "text-base" : "text-sm"}`}>
            {WEEKDAYS.map((day) => (
              <div key={day} className="font-semibold text-muted-foreground">
                {day.slice(0, 2)}
              </div>
            ))}
            {monthDays.map((day) => {
              const hasItems = items.some((item) => itemTouchesDay(item, day));
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={cn(
                    `mx-auto flex flex-col items-center justify-center rounded-full hover:bg-muted ${
                      kiosk ? "h-11 w-11 text-base" : "h-9 w-9 text-sm"
                    }`,
                    !isSameMonth(day, visibleMonth) && "text-muted-foreground/50",
                    isSameDay(day, selectedDay) && "bg-violet-600 text-white hover:bg-violet-700",
                  )}
                  onClick={() => onSelectDay(day)}
                >
                  <span>{format(day, "d")}</span>
                  {hasItems && (
                    <span
                      className={cn(
                        "mt-0.5 h-1 w-1 rounded-full bg-violet-500",
                        isSameDay(day, selectedDay) && "bg-white",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`space-y-3 overflow-auto ${kiosk ? "max-h-[420px] p-6" : "max-h-[360px] p-5"}`}>
          <h4 className={`font-semibold text-foreground ${kiosk ? "text-lg" : ""}`}>
            {format(selectedDay, "EEEE, MMM d")}
          </h4>
          {selectedWeather && (
            <div className="rounded-md border bg-sky-500/5 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {weatherSummary(selectedWeather.weatherCode)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Forecast for LCUP Malolos
                  </p>
                </div>
                <WeatherIcon
                  code={selectedWeather.weatherCode}
                  className="h-5 w-5 text-sky-600"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-background p-2">
                  <p className="text-muted-foreground">Temperature</p>
                  <p className="font-semibold text-foreground">
                    {temperatureLabel(selectedWeather) || "Not available"}
                  </p>
                </div>
                <div className="rounded bg-background p-2">
                  <p className="text-muted-foreground">Precipitation</p>
                  <p className="font-semibold text-foreground">
                    {rainLabel(selectedWeather) || "Not available"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Weather by Open-Meteo
              </p>
            </div>
          )}
          {dayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reservations or blocks scheduled.
            </p>
          ) : (
            dayItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={cn(
                  `w-full rounded-md border text-left ${
                    kiosk ? "p-4 text-base" : "p-3 text-sm"
                  }`,
                  statusClass(item),
                )}
                onClick={() => onOpenItem(item)}
              >
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs font-medium">{itemTimeLabel(item)}</p>
                {item.subtitle && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
