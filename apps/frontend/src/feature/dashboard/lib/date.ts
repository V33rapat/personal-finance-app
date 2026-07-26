export interface DashboardDateRange {
  start: string;
  end: string;
}

function getBangkokDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: parts.find((part) => part.type === "year")?.value,
    month: parts.find((part) => part.type === "month")?.value,
    day: parts.find((part) => part.type === "day")?.value,
  };
}

export function getBangkokToday() {
  const { year, month, day } = getBangkokDateParts(new Date());

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
  const { year, month, day } = getBangkokDateParts(value);

  if (!year || !month || !day) {
    throw new Error("Could not format Bangkok calendar date");
  }

  return `${year}-${month}-${day}`;
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
