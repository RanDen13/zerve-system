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
import { useEffect, useMemo, useState } from "react";

export type VenueCalendarItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  status: "PENDING" | "BOOKED" | "APPROVED" | "BLOCKED";
  scope?: "VENUE" | "UNIVERSITY";
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
  if (max && min) return `${min}-${max}°C`;
  if (max) return `${max}°C`;
  if (min) return `${min}°C`;
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

function statusClass(item: Pick<VenueCalendarItem, "status" | "scope">) {
  if (item.scope === "UNIVERSITY") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200";
  }
  if (item.status === "APPROVED" || item.status === "BOOKED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  }
  if (item.status === "BLOCKED") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200";
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
}: {
  items: VenueCalendarItem[];
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState(() =>
    startOfDay(sapfCalendarDate(new Date())),
  );
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(sapfCalendarDate(new Date())),
  );
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
      className="overflow-hidden rounded-lg border bg-card/95 shadow-sm backdrop-blur"
    >
      <div className="flex flex-col gap-4 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border bg-card shadow-xs">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              {format(selectedDay, "MMM")}
            </span>
            <span className="text-xl font-bold text-violet-700">
              {format(selectedDay, "d")}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">
                {calendarView === "month"
                  ? format(visibleMonth, "MMMM yyyy")
                  : format(selectedDay, "MMMM d, yyyy")}
              </h3>
              <Badge variant="outline">
                {calendarView === "month" ? "Month" : format(selectedDay, "EEEE")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {calendarView === "month"
                ? description
                : `${selectedDayItems.length} item${
                    selectedDayItems.length === 1 ? "" : "s"
                  } scheduled for this day.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedWeather ? (
            <div className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm shadow-xs">
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
            <div className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm text-muted-foreground shadow-xs">
              Loading weather...
            </div>
          ) : null}
          <div className="flex overflow-hidden rounded-md border shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none border-r px-3"
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
              className="rounded-none px-4"
              onClick={goToday}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none border-l px-3"
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
            <SelectTrigger className="h-9 min-w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month view</SelectItem>
              <SelectItem value="day">Day view</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b bg-muted/40 p-3">
        {[
          { label: "Pending", className: "bg-amber-500" },
          { label: "Booked", className: "bg-emerald-500" },
          { label: "Blocked", className: "bg-red-500" },
          { label: "University-wide", className: "bg-violet-500" },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
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
          monthItems={monthItems}
          selectedDay={selectedDay}
          visibleMonth={visibleMonth}
          weeks={weeks}
          weatherByDate={weatherByDate}
          onSelectDay={(day) => selectCalendarDay(day)}
          onOpenDay={(day) => selectCalendarDay(day, "day")}
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
          selectedDay={selectedDay}
          visibleMonth={visibleMonth}
          weatherByDate={weatherByDate}
          onSelectDay={(day) => selectCalendarDay(day, "day")}
        />
        </motion.div>
      )}
      </AnimatePresence>

    </motion.div>
  );
}

function MonthCalendar({
  compact,
  monthItems,
  selectedDay,
  visibleMonth,
  weeks,
  weatherByDate,
  onSelectDay,
  onOpenDay,
}: {
  compact: boolean;
  monthItems: NormalizedCalendarItem[];
  selectedDay: Date;
  visibleMonth: Date;
  weeks: Date[][];
  weatherByDate: Map<string, CalendarWeatherDay>;
  onSelectDay: (day: Date) => void;
  onOpenDay: (day: Date) => void;
}) {
  const maxLanes = compact ? 3 : 4;
  const weekMinHeight = compact ? 128 : 164;

  return (
    <>
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
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
                      "min-h-full border-r bg-card p-2 text-left align-top last:border-r-0 hover:bg-muted/50",
                      !isSameMonth(day, visibleMonth) &&
                        "bg-muted/25 text-muted-foreground/70",
                      isToday(day) && "bg-blue-500/10",
                      isSameDay(day, selectedDay) &&
                        "ring-2 ring-inset ring-violet-500/50",
                    )}
                    onClick={() => onSelectDay(day)}
                    onDoubleClick={() => onOpenDay(day)}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={cn(
                          "flex h-6 min-w-6 w-fit items-center justify-center rounded-full px-1.5 text-xs font-semibold",
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
                      "pointer-events-auto mx-1 h-7 truncate rounded-md border px-2 text-left text-[11px] font-semibold leading-6 shadow-xs",
                      statusClass(item),
                    )}
                    style={{
                      gridColumn: `${colStart} / span ${span}`,
                      gridRow: lane + 1,
                    }}
                    title={`${item.title} - ${itemTimeLabel(item)}`}
                    onClick={() => onOpenDay(item.startAt)}
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
                    className="pointer-events-auto col-span-7 px-3 text-right text-[11px] font-semibold text-muted-foreground"
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
    </>
  );
}

function DayCalendar({
  items,
  selectedDay,
  visibleMonth,
  weatherByDate,
  onSelectDay,
}: {
  items: NormalizedCalendarItem[];
  selectedDay: Date;
  visibleMonth: Date;
  weatherByDate: Map<string, CalendarWeatherDay>;
  onSelectDay: (day: Date) => void;
}) {
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
  const dayEventBlocks = dayItems
    .map((item) => {
      const clippedStart = clampDate(item.startAt, visibleStart, visibleEnd);
      const clippedEnd = clampDate(item.endAt, visibleStart, visibleEnd);
      const startMinutes =
        clippedStart.getHours() * 60 +
        clippedStart.getMinutes() -
        DAY_START_HOUR * 60;
      const durationMinutes = Math.max(
        30,
        (clippedEnd.getTime() - clippedStart.getTime()) / 60000,
      );
      const top = (startMinutes / 60) * HOUR_HEIGHT;
      const height = Math.max(38, (durationMinutes / 60) * HOUR_HEIGHT);

      return {
        item,
        top,
        height,
        end: top + height,
        lane: 0,
      };
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);
  const laneEnds: number[] = [];
  dayEventBlocks.forEach((eventBlock) => {
    let lane = laneEnds.findIndex((laneEnd) => eventBlock.top >= laneEnd);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    eventBlock.lane = lane;
    laneEnds[lane] = eventBlock.end;
  });
  const laneCount = Math.max(1, laneEnds.length);
  const timelineHeight = hours.length * HOUR_HEIGHT;
  const now = sapfCalendarDate(new Date());
  const showNow = isToday(selectedDay);
  const nowTop =
    ((now.getHours() * 60 + now.getMinutes() - DAY_START_HOUR * 60) / 60) *
    HOUR_HEIGHT;
  const selectedWeather = weatherByDate.get(weatherDateKey(selectedDay));

  return (
    <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="max-h-[720px] overflow-auto border-b lg:border-b-0 lg:border-r">
        <div
          className="relative grid grid-cols-[72px_minmax(0,1fr)]"
          style={{ height: timelineHeight }}
        >
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-b bg-muted/20 pr-2 pt-2 text-right text-xs text-muted-foreground">
                {format(new Date(2026, 0, 1, hour), "h a")}
              </div>
              <div className="border-b bg-card" />
            </div>
          ))}

          {showNow && nowTop >= 0 && nowTop <= timelineHeight && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 grid grid-cols-[72px_minmax(0,1fr)] items-center"
              style={{ top: nowTop }}
            >
              <div className="pr-2 text-right text-xs font-semibold text-violet-600">
                {format(now, "h:mm a")}
              </div>
              <div className="h-px bg-violet-500" />
            </div>
          )}

          <div className="absolute left-[72px] right-0 top-0">
            {dayEventBlocks.map(({ item, top, height, lane }) => {
              return (
                <div
                  key={item.id}
                  className={cn(
                    "absolute left-3 right-3 overflow-hidden rounded-md border p-2 text-xs shadow-xs",
                    statusClass(item),
                  )}
                  style={{
                    top,
                    height,
                    left: `calc(${(lane / laneCount) * 100}% + 12px)`,
                    right: `calc(${(1 - (lane + 1) / laneCount) * 100}% + 12px)`,
                  }}
                  title={`${item.title} - ${itemTimeLabel(item)}`}
                >
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="mt-1 truncate font-medium">
                    {itemTimeLabel(item)}
                  </p>
                  {item.subtitle && (
                    <p className="mt-1 line-clamp-2 text-muted-foreground">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="bg-card">
        <div className="border-b p-5">
          <div className="mb-5 flex items-center justify-between">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">{format(visibleMonth, "MMMM yyyy")}</p>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-7 gap-y-3 text-center text-sm">
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
                    "mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm hover:bg-muted",
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

        <div className="max-h-[360px] space-y-3 overflow-auto p-5">
          <h4 className="font-semibold text-foreground">
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
              <div
                key={item.id}
                className={cn("rounded-md border p-3 text-sm", statusClass(item))}
              >
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs font-medium">{itemTimeLabel(item)}</p>
                {item.subtitle && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
