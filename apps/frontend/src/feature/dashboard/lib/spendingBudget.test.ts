import { describe, expect, it } from "vitest";
import {
  getSpendingBudgetProgress,
  getSpendingBudgetStatus,
  getSpendingBudgetValidationErrors,
} from "./spendingBudget";

describe("spending budget helpers", () => {
  it.each([
    [79.99, "on_track"],
    [80, "near_limit"],
    [99.99, "near_limit"],
    [100, "over_budget"],
  ] as const)("returns the correct status at %s percent", (percentage, status) => {
    expect(getSpendingBudgetStatus(percentage)).toBe(status);
  });

  it("caps progress visually without changing the real percentage", () => {
    expect(getSpendingBudgetProgress(-5)).toBe(0);
    expect(getSpendingBudgetProgress(75.5)).toBe(75.5);
    expect(getSpendingBudgetProgress(130)).toBe(100);
  });

  it("requires a valid name, amount, and at least one spending source", () => {
    expect(
      getSpendingBudgetValidationErrors({
        name: " ",
        amount: "180.999",
        period: "daily",
        category_ids: [],
        includes_uncategorized: false,
      })
    ).toEqual({
      name: "ชื่องบใช้จ่ายต้องมี 3-100 ตัวอักษร",
      amount: "กรุณากรอกวงเงินมากกว่า 0 บาท และมีทศนิยมไม่เกิน 2 ตำแหน่ง",
      categories: "เลือกอย่างน้อย 1 หมวด หรือเลือกไม่ระบุหมวดหมู่",
    });
  });
});
