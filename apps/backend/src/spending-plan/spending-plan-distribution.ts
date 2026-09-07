import type { SpendingPlanDistributionType } from './dto/spending-plan-purpose.dto';

const DAY_MS = 86_400_000;

export interface DistributionRule {
  type: SpendingPlanDistributionType;
  weekdays: number[];
  dates: string[];
}

export interface DailyAllocationValue {
  date: string;
  amount: number;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = toDate(start);
  const last = toDate(end);

  for (; cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(toDateString(cursor));
  }

  return dates;
}

function getIsoWeekday(value: string) {
  const day = toDate(value).getUTCDay();
  return day === 0 ? 7 : day;
}

function daysBetween(start: string, end: string) {
  return Math.floor((toDate(end).getTime() - toDate(start).getTime()) / DAY_MS);
}

export function getDistributionDates(
  planStart: string,
  windowStart: string,
  windowEnd: string,
  rule: DistributionRule,
) {
  const dates = getDateRange(windowStart, windowEnd);

  switch (rule.type) {
    case 'equal_daily':
      return dates;
    case 'weekdays':
      return dates.filter((date) => getIsoWeekday(date) <= 5);
    case 'weekly':
      return dates.filter((date) =>
        rule.weekdays.includes(getIsoWeekday(date)),
      );
    case 'biweekly':
      return dates.filter(
        (date) =>
          Math.floor(daysBetween(planStart, date) / 7) % 2 === 0 &&
          rule.weekdays.includes(getIsoWeekday(date)),
      );
    case 'specific_dates':
      return [...new Set(rule.dates)]
        .filter((date) => date >= windowStart && date <= windowEnd)
        .sort();
  }
}

export function buildOccurrenceAllocations(
  planStart: string,
  planEnd: string,
  targetAmount: number,
  selectedDates: string[],
): DailyAllocationValue[] {
  const selected = [...new Set(selectedDates)].sort();
  const targetCents = Math.round(targetAmount * 100);
  const selectedDatesInCents = new Map(
    selected.map((date) => [date, targetCents]),
  );

  return getDateRange(planStart, planEnd).map((date) => ({
    date,
    amount: (selectedDatesInCents.get(date) ?? 0) / 100,
  }));
}
