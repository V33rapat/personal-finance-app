export type SpendingPlanStatus = "scheduled" | "active" | "completed" | "cancelled";
export type SpendingPlanView = "monthly" | "range" | "daily";
export type SpendingPlanDistributionType =
  | "equal_daily"
  | "weekdays"
  | "weekly"
  | "biweekly"
  | "specific_dates";

export interface SpendingPlanDistributionFormValue {
  type: SpendingPlanDistributionType | null;
  weekdays: number[];
  dates: string[];
}

export interface SpendingPlanPurposeFormValue {
  id: string;
  name: string;
  amount: string;
  category_ids: string[];
  distribution: SpendingPlanDistributionFormValue;
}

export interface SpendingPlanFormValues {
  name: string;
  amount: string;
  start_date: string;
  end_date: string;
  wallet_ids: string[];
  purposes: SpendingPlanPurposeFormValue[];
}

export interface SpendingPlanValidationErrors {
  name?: string;
  amount?: string;
  dates?: string;
  wallets?: string;
  purposes?: string;
  distributions?: string;
}

export function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getPlanDates(startDate: string, endDate: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return [];
  }

  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return [];
  }

  const dates: string[] = [];

  for (let date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(toDateString(date));
  }

  return dates;
}

export function createPurpose(index: number): SpendingPlanPurposeFormValue {
  return {
    id: `purpose-${index}-${Date.now()}`,
    name: "",
    amount: "0",
    category_ids: [],
    distribution: {
      type: "equal_daily",
      weekdays: [],
      dates: [],
    },
  };
}

function getIsoWeekday(value: string) {
  const day = toUtcDate(value).getUTCDay();
  return day === 0 ? 7 : day;
}

function daysBetween(start: string, end: string) {
  return Math.floor(
    (toUtcDate(end).getTime() - toUtcDate(start).getTime()) / 86_400_000,
  );
}

export function getDistributionDates(
  planStart: string,
  windowStart: string,
  windowEnd: string,
  distribution: SpendingPlanDistributionFormValue,
) {
  const dates = getPlanDates(windowStart, windowEnd);

  switch (distribution.type) {
    case "equal_daily":
      return dates;
    case "weekdays":
      return dates.filter((date) => getIsoWeekday(date) <= 5);
    case "weekly":
      return dates.filter((date) =>
        distribution.weekdays.includes(getIsoWeekday(date)),
      );
    case "biweekly":
      return dates.filter(
        (date) =>
          Math.floor(daysBetween(planStart, date) / 7) % 2 === 0 &&
          distribution.weekdays.includes(getIsoWeekday(date)),
      );
    case "specific_dates":
      return [...new Set(distribution.dates)]
        .filter((date) => date >= windowStart && date <= windowEnd)
        .sort();
    default:
      return [];
  }
}

export function getDistributionPreview(
  purpose: SpendingPlanPurposeFormValue,
  planStart: string,
  windowStart: string,
  windowEnd: string,
) {
  const selectedDates = getDistributionDates(
    planStart,
    windowStart,
    windowEnd,
    purpose.distribution,
  );
  const amount = Number(purpose.amount || 0);
  const cents = Number.isFinite(amount) ? Math.round(amount * 100) : 0;

  return {
    selectedDates,
    dayCount: selectedDates.length,
    amountPerDay:
      selectedDates.length > 0
        ? Math.floor(cents / selectedDates.length) / 100
        : 0,
    total: cents / 100,
  };
}

function isMoney(value: string, allowZero = false) {
  const normalized = value.trim();
  const amount = Number(normalized);

  return (
    /^\d+(?:\.\d{1,2})?$/.test(normalized) &&
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0)
  );
}

export function getSpendingPlanValidationErrors(
  values: SpendingPlanFormValues,
  options: {
    skipPlanAmount?: boolean;
    windowStart?: string;
    windowEnd?: string;
  } = {},
): SpendingPlanValidationErrors {
  const errors: SpendingPlanValidationErrors = {};
  const dates = getPlanDates(values.start_date, values.end_date);
  const windowStart = options.windowStart ?? values.start_date;
  const windowEnd = options.windowEnd ?? values.end_date;

  if (values.name.trim().length < 3 || values.name.trim().length > 100) {
    errors.name = "กรุณากรอกชื่อแผน 3-100 ตัวอักษร";
  }

  if (!options.skipPlanAmount && !isMoney(values.amount)) {
    errors.amount = "กรุณากรอกยอดรวมของแผนให้มากกว่า 0 บาท";
  }

  if (dates.length === 0 || dates.length > 31) {
    errors.dates = "แผนต้องมีระยะเวลา 1-31 วัน";
  }

  if (values.wallet_ids.length === 0) {
    errors.wallets = "กรุณาเลือกกระเป๋าอย่างน้อย 1 ใบ";
  }

  if (values.purposes.length === 0 || values.purposes.length > 10) {
    errors.purposes = "แผนมีวัตถุประสงค์ได้ 1-10 รายการ";
  } else if (
    values.purposes.some(
      (purpose) =>
        !purpose.name.trim() ||
        purpose.category_ids.length === 0 ||
        !isMoney(purpose.amount),
    )
  ) {
    errors.purposes = "กรอกชื่อ เลือกหมวดหมู่ และยอดของทุกวัตถุประสงค์ให้ครบ";
  }

  const categories = values.purposes.flatMap((purpose) => purpose.category_ids);
  if (new Set(categories).size !== categories.length) {
    errors.purposes = "หนึ่งหมวดหมู่เลือกได้เพียงหนึ่งวัตถุประสงค์";
  }

  const hasInvalidDistribution = values.purposes.some((purpose) => {
    const distribution = purpose.distribution;
    if (!distribution.type) return true;
    if (
      (distribution.type === "weekly" || distribution.type === "biweekly") &&
      distribution.weekdays.length === 0
    ) {
      return true;
    }

    return (
      getDistributionDates(
        values.start_date,
        windowStart,
        windowEnd,
        distribution,
      ).length === 0
    );
  });

  if (hasInvalidDistribution) {
    errors.distributions = "เลือกวันสำหรับรูปแบบการกระจายของทุกวัตถุประสงค์ให้ครบ";
  }

  const purposeTotal = values.purposes.reduce(
    (total, purpose) => total + Number(purpose.amount || 0),
    0,
  );
  if (
    !options.skipPlanAmount &&
    isMoney(values.amount) &&
    Math.round(purposeTotal * 100) !== Math.round(Number(values.amount) * 100)
  ) {
    errors.purposes = "ยอดของทุกวัตถุประสงค์รวมกันต้องเท่ากับยอดรวมของแผน";
  }

  return errors;
}

export function getPlanRemaining(
  amount: string | number,
  actual: string | number,
) {
  return Number(amount) - Number(actual);
}
