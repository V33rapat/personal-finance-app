import { describe, expect, it } from "vitest";
import {
  getDefaultSpendingBudgetPeriodSelections,
  getSpendingBudgetOverviewSearchParams,
  getSpendingBudgetProgress,
  getSpendingBudgetStatus,
  getSpendingBudgetValidationErrors,
  isSevenDaySpendingBudgetWeek,
} from "./spendingBudget";

describe("spending budget helpers", () => {
  it.each([
    [79.99, "on_track"],
    [80, "near_limit"],
    [99.99, "near_limit"],
    [100, "over_budget"],
  ] as const)(
    "returns the correct status at %s percent",
    (percentage, status) => {
      expect(getSpendingBudgetStatus(percentage)).toBe(status);
    },
  );

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
      }),
    ).toEqual({
      name: "ชื่องบใช้จ่ายต้องมี 3-100 ตัวอักษร",
      amount: "กรุณากรอกวงเงินมากกว่า 0 บาท และมีทศนิยมไม่เกิน 2 ตำแหน่ง",
      categories: "เลือกอย่างน้อย 1 หมวด หรือเลือกไม่ระบุหมวดหมู่",
    });
  });

  it("creates current selections for each reporting period", () => {
    expect(getDefaultSpendingBudgetPeriodSelections("2026-07-22")).toEqual({
      daily: { period: "daily", date: "2026-07-22" },
      weekly: { period: "weekly", start: "2026-07-20", end: "2026-07-26" },
      monthly: { period: "monthly", month: "2026-07" },
      yearly: { period: "yearly", year: "2026" },
    });
  });

  it("builds the API query from the selected reporting period", () => {
    expect(
      getSpendingBudgetOverviewSearchParams({
        period: "weekly",
        start: "2026-08-10",
        end: "2026-08-16",
      }).toString(),
    ).toBe("period=weekly&start=2026-08-10&end=2026-08-16");
    expect(
      getSpendingBudgetOverviewSearchParams({
        period: "yearly",
        year: "2030",
      }).toString(),
    ).toBe("period=yearly&year=2030");
  });

  it("accepts exactly seven consecutive days for a custom weekly selection", () => {
    expect(
      isSevenDaySpendingBudgetWeek({
        period: "weekly",
        start: "2026-08-10",
        end: "2026-08-16",
      }),
    ).toBe(true);
    expect(
      isSevenDaySpendingBudgetWeek({
        period: "weekly",
        start: "2026-08-10",
        end: "2026-08-15",
      }),
    ).toBe(false);
  });
});
