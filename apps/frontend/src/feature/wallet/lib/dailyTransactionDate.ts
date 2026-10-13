const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  if (!year || !month || !day) {
    throw new Error("Could not determine the Bangkok calendar date");
  }

  return `${year}-${month}-${day}`;
}

export function isCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function toUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toCalendarDateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(value: string, amount: number) {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}
