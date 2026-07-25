export interface DashboardDateRange {
  start: string;
  end: string;
}

function getBangkokPart(type: Intl.DateTimeFormatPartTypes) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts()
    .find((part) => part.type === type)?.value;
}

export function getBangkokToday() {
  const year = getBangkokPart("year");
  const month = getBangkokPart("month");
  const day = getBangkokPart("day");

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function getCurrentBangkokWeekToDate(): DashboardDateRange {
  const today = toUtcDate(getBangkokToday());
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - daysSinceMonday);

  return { start: toDateString(start), end: toDateString(today) };
}

export function toUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatThaiDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  if (start === end) {
    return formatter.format(toUtcDate(start));
  }

  return `${formatter.format(toUtcDate(start))} - ${formatter.format(toUtcDate(end))}`;
}

export function formatThaiMonth(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(`${value}-01`));
}

export function formatThaiYear(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(`${value}-01-01`));
}

export function getDayCount(start: string, end: string) {
  return (
    Math.floor(
      (toUtcDate(end).getTime() - toUtcDate(start).getTime()) / 86_400_000,
    ) + 1
  );
}
