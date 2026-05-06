const SAPF_TIME_ZONE = "Asia/Manila";
const SAPF_UTC_OFFSET_MINUTES = 8 * 60;

type SapfDateParts = {
  year: string;
  month: string;
  day: string;
  hour?: string;
  minute?: string;
};

function datePartsInSapfTimeZone(date: Date): SapfDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAPF_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as SapfDateParts;
}

function timePartsInSapfTimeZone(date: Date): SapfDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAPF_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as SapfDateParts;
}

export function sapfCalendarDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(Number.NaN);

  const parts = timePartsInSapfTimeZone(date);
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    0,
    0,
  );
}

export function sapfLocalDateTime(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) {
    return new Date(Number.NaN);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return new Date(Number.NaN);
  }

  const result = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute - SAPF_UTC_OFFSET_MINUTES,
      0,
      0,
    ),
  );

  return formatSapfDateInputValue(result) === date &&
    formatSapfTimeInputValue(result) === time
    ? result
    : new Date(Number.NaN);
}

export function startOfSapfDay(date = new Date()) {
  return sapfLocalDateTime(formatSapfDateInputValue(date), "00:00");
}

export function addSapfCalendarDays(date: Date, days: number) {
  const parts = datePartsInSapfTimeZone(date);
  const result = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) + days,
      0,
      -SAPF_UTC_OFFSET_MINUTES,
      0,
      0,
    ),
  );

  return result;
}

export function formatSapfDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = datePartsInSapfTimeZone(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatSapfTimeInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = timePartsInSapfTimeZone(date);
  return `${parts.hour}:${parts.minute}`;
}

export function formatSapfTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    timeZone: SAPF_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSapfDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    timeZone: SAPF_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSapfDateForMessage(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    timeZone: SAPF_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSapfDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    timeZone: SAPF_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
