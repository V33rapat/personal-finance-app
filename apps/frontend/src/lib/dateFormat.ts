const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function isValidDateParts(year: number, month: number, day: number) {
  if (year < 1 || year > 9999 || month < 1 || month > 12) return false;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidIsoDate(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);

  return Boolean(
    match &&
      isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
  );
}

export function parseDisplayDate(value: string): string | null {
  const trimmed = value.trim();
  const displayMatch = DISPLAY_DATE_PATTERN.exec(trimmed);
  const digitsMatch = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
  const match = displayMatch ?? digitsMatch;

  if (!match) return null;

  const [, day, month, year] = match;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);

  if (!isValidDateParts(numericYear, numericMonth, numericDay)) return null;

  return `${year}-${month}-${day}`;
}

export function formatDateInput(value: string) {
  if (!isValidIsoDate(value)) return "";

  const [, year, month, day] = ISO_DATE_PATTERN.exec(value)!;
  return `${day}/${month}/${year}`;
}

export function formatDateDraft(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function getDateDraftCaretPosition(value: string, digitCount: number) {
  if (digitCount <= 0) return 0;

  let seenDigits = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) seenDigits += 1;
    if (seenDigits === digitCount) {
      return value[index + 1] === "/" ? index + 2 : index + 1;
    }
  }

  return value.length;
}

function getIsoDateParts(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match || !isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) {
    return null;
  }

  return { year: match[1], month: match[2], day: match[3] };
}

export function formatDisplayDate(value: string) {
  const dateParts = getIsoDateParts(value);

  if (dateParts) {
    return `${dateParts.day}/${dateParts.month}/${dateParts.year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat("en-GB", {
    calendar: "gregory",
    numberingSystem: "latn",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  return day && month && year ? `${day}/${month}/${year}` : value;
}

export function formatCompactDate(value: string) {
  const dateParts = getIsoDateParts(value);
  return dateParts ? `${dateParts.day}/${dateParts.month}` : value;
}

export function formatDisplayDateRange(start: string, end: string) {
  const formattedStart = formatDisplayDate(start);
  return start === end ? formattedStart : `${formattedStart} - ${formatDisplayDate(end)}`;
}

export function toLocalCalendarDate(value: string) {
  const dateParts = getIsoDateParts(value);
  if (!dateParts) return undefined;

  return new Date(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day));
}

export function fromLocalCalendarDate(value: Date) {
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
