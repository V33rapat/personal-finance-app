export type SpendingBudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

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

export function getSpendingBudgetStatus(percentage: number): SpendingBudgetStatus {
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
  values: SpendingBudgetFormValues
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
