import {
  formatThaiDateRange,
  formatThaiMonth,
  formatThaiYear,
  toDateString,
  toUtcDate,
} from "./date";

export type SpendingBudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type SpendingBudgetPeriodSelection =
  | { period: "daily"; date: string }
  | { period: "weekly"; start: string; end: string }
  | { period: "monthly"; month: string }
  | { period: "yearly"; year: string };

export type SpendingBudgetPeriodSelections = {
  [Period in SpendingBudgetPeriod]: Extract<
    SpendingBudgetPeriodSelection,
    { period: Period }
  >;
};

export interface SpendingBudgetFormValues {
  name: string;
  amount: string;
  period: SpendingBudgetPeriod;
  category_ids: string[];
  includes_uncategorized: boolean;
}

export type SpendingBudgetStatus = "on_track" | "near_limit" | "over_budget";

export interface SpendingBudgetValidationErrors {
  name?: string;
  amount?: string;
  categories?: string;
}

function getCurrentWeek(today: string) {
  const currentDate = toUtcDate(today);
  const daysSinceMonday = (currentDate.getUTCDay() + 6) % 7;
  const start = new Date(currentDate);
  start.setUTCDate(currentDate.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { start: toDateString(start), end: toDateString(end) };
}

export function getDefaultSpendingBudgetPeriodSelections(
  today: string,
): SpendingBudgetPeriodSelections {
  return {
    daily: { period: "daily", date: today },
    weekly: { period: "weekly", ...getCurrentWeek(today) },
    monthly: { period: "monthly", month: today.slice(0, 7) },
    yearly: { period: "yearly", year: today.slice(0, 4) },
  };
}

export function isSevenDaySpendingBudgetWeek(
  selection: Extract<SpendingBudgetPeriodSelection, { period: "weekly" }>,
) {
  const start = toUtcDate(selection.start);
  const end = toUtcDate(selection.end);

  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1 === 7;
}

export function getSpendingBudgetOverviewSearchParams(
  selection: SpendingBudgetPeriodSelection,
) {
  const params = new URLSearchParams({ period: selection.period });

  if (selection.period === "daily") {
    params.set("date", selection.date);
  }

  if (selection.period === "weekly") {
    params.set("start", selection.start);
    params.set("end", selection.end);
  }

  if (selection.period === "monthly") {
    params.set("month", selection.month);
  }

  if (selection.period === "yearly") {
    params.set("year", selection.year);
  }

  return params;
}

export function formatSpendingBudgetPeriodSelection(
  selection: SpendingBudgetPeriodSelection,
) {
  if (selection.period === "daily") {
    return formatThaiDateRange(selection.date, selection.date);
  }

  if (selection.period === "weekly") {
    return formatThaiDateRange(selection.start, selection.end);
  }

  if (selection.period === "monthly") {
    return formatThaiMonth(selection.month);
  }

  return formatThaiYear(selection.year);
}

export function getSpendingBudgetStatus(
  percentage: number,
): SpendingBudgetStatus {
  if (percentage >= 100) {
    return "over_budget";
  }

  if (percentage >= 80) {
    return "near_limit";
  }

  return "on_track";
}

export function getSpendingBudgetProgress(percentage: number) {
  return Math.max(0, Math.min(percentage, 100));
}

export function getSpendingBudgetValidationErrors(
  values: SpendingBudgetFormValues,
): SpendingBudgetValidationErrors {
  const errors: SpendingBudgetValidationErrors = {};
  const name = values.name.trim();
  const normalizedAmount = values.amount.trim();
  const amount = Number(normalizedAmount);

  if (name.length < 3 || name.length > 100) {
    errors.name = "ชื่องบใช้จ่ายต้องมี 3-100 ตัวอักษร";
  }

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    errors.amount = "กรุณากรอกวงเงินมากกว่า 0 บาท และมีทศนิยมไม่เกิน 2 ตำแหน่ง";
  }

  if (values.category_ids.length === 0 && !values.includes_uncategorized) {
    errors.categories = "เลือกอย่างน้อย 1 หมวด หรือเลือกไม่ระบุหมวดหมู่";
  }

  return errors;
}
