export type SpendingPlanStatus = "scheduled" | "active" | "completed" | "cancelled";
export type SpendingPlanView = "monthly" | "range" | "daily";

export interface SpendingPlanAllocationFormValue {
  date: string;
  amount: string;
}

export interface SpendingPlanPurposeFormValue {
  id: string;
  name: string;
  category_ids: string[];
  allocations: SpendingPlanAllocationFormValue[];
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
  allocations?: string;
}

export function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getPlanDates(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return [];
  }

  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dates: string[] = [];

  for (let date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(toDateString(date));
  }

  return dates;
}

export function createPurpose(
  dates: string[],
  index: number,
): SpendingPlanPurposeFormValue {
  return {
    id: `purpose-${index}-${Date.now()}`,
    name: "",
    category_ids: [],
    allocations: dates.map((date) => ({ date, amount: "0" })),
  };
}

export function synchronizePurposeAllocations(
  purpose: SpendingPlanPurposeFormValue,
  dates: string[],
): SpendingPlanPurposeFormValue {
  const existing = new Map(
    purpose.allocations.map((allocation) => [allocation.date, allocation.amount]),
  );

  return {
    ...purpose,
    allocations: dates.map((date) => ({
      date,
      amount: existing.get(date) ?? "0",
    })),
  };
}

export function synchronizePlanAllocations(values: SpendingPlanFormValues) {
  const dates = getPlanDates(values.start_date, values.end_date);

  return {
    ...values,
    purposes: values.purposes.map((purpose) =>
      synchronizePurposeAllocations(purpose, dates),
    ),
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
  options: { skipPlanAmount?: boolean } = {},
): SpendingPlanValidationErrors {
  const errors: SpendingPlanValidationErrors = {};
  const dates = getPlanDates(values.start_date, values.end_date);

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
        purpose.allocations.length !== dates.length,
    )
  ) {
    errors.purposes = "กรอกชื่อ เลือกหมวดหมู่ และจัดสรรเงินให้ครบทุกวัตถุประสงค์";
  }

  const categories = values.purposes.flatMap((purpose) => purpose.category_ids);

  if (new Set(categories).size !== categories.length) {
    errors.purposes = "หนึ่งหมวดหมู่เลือกได้เพียงหนึ่งวัตถุประสงค์";
  }

  if (
    values.purposes.some((purpose) =>
      purpose.allocations.some((allocation) => !isMoney(allocation.amount, true)),
    )
  ) {
    errors.allocations = "จำนวนเงินแต่ละช่องต้องเป็น 0 หรือมีทศนิยมไม่เกิน 2 ตำแหน่ง";
  }

  const allocationTotal = values.purposes.reduce(
    (total, purpose) =>
      total +
      purpose.allocations.reduce(
        (purposeTotal, allocation) => purposeTotal + Number(allocation.amount || 0),
        0,
      ),
    0,
  );

  if (
    !options.skipPlanAmount &&
    isMoney(values.amount) &&
    Math.round(allocationTotal * 100) !== Math.round(Number(values.amount) * 100)
  ) {
    errors.allocations = "ยอดจัดสรรทุกช่องรวมกันต้องเท่ากับยอดรวมของแผน";
  }

  return errors;
}

export function getPlanRemaining(
  amount: string | number,
  actual: string | number,
) {
  return Number(amount) - Number(actual);
}
