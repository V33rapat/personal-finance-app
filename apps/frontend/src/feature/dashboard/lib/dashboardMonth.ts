export interface MonthValueParts {
  year: number;
  month: number;
}

export function parseMonthValue(value: string): MonthValueParts | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return null;

  return { year: Number(match[1]), month: Number(match[2]) };
}

export function toMonthValue(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function formatMonthValue(value: string, locale: string) {
  const parts = parseMonthValue(value);
  if (!parts) return "";

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
}

export function formatMonthName(month: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, month - 1, 1)));
}

export function formatCalendarYear(year: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, 0, 1)));
}

export function isMonthAfter(value: string, maximum: string) {
  return value > maximum;
}
