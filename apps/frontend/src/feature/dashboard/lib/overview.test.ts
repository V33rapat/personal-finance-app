import { describe, expect, it } from "vitest";
import type { DashboardOverview } from "../hooks/useDashboardOverview";
import { buildDashboardChartData, buildExpenseBreakdown } from "./overview";

function createOverview(overrides: Partial<DashboardOverview> = {}): DashboardOverview {
  return {
    period_start: "2026-07-20",
    period_end: "2026-07-20",
    totals: { income: "0.00", expense: "0.00", net: "0.00" },
    days: [],
    expense_categories: [],
    ...overrides,
  };
}

describe("dashboard overview helpers", () => {
  it("groups multiple hidden expense categories into Other while keeping visible categories", () => {
    const overview = createOverview({
      expense_categories: [
        {
          category_id: "food",
          category_name: "อาหาร",
          category_color: "#DC2626",
          amount: "120.00",
        },
        {
          category_id: "travel",
          category_name: "เดินทาง",
          category_color: "#E11D48",
          amount: "80.00",
        },
        {
          category_id: "rent",
          category_name: "ค่าเช่า",
          category_color: "#F43F5E",
          amount: "50.00",
        },
      ],
    });

    expect(buildExpenseBreakdown(overview, ["food", "travel"])).toEqual([
      { key: "expense-other", label: "อื่นๆ", amount: 200, type: "expense" },
      { key: "expense-rent", label: "ค่าเช่า", amount: 50, type: "expense" },
    ]);
  });

  it("keeps uncategorized expenses separate from Other", () => {
    const overview = createOverview({
      expense_categories: [
        {
          category_id: "food",
          category_name: "อาหาร",
          category_color: "#DC2626",
          amount: "120.00",
        },
        {
          category_id: null,
          category_name: "Uncategorized",
          category_color: null,
          amount: "75.00",
        },
      ],
    });

    expect(buildExpenseBreakdown(overview, ["food"])).toEqual([
      { key: "expense-other", label: "อื่นๆ", amount: 120, type: "expense" },
      {
        key: "expense-uncategorized",
        label: "ไม่ระบุหมวดหมู่",
        amount: 75,
        type: "expense",
      },
    ]);
  });

  it("keeps expense values positive in chart data and preserves category groups", () => {
    const overview = createOverview({
      days: [
        {
          date: "2026-07-20",
          income_total: "1000.00",
          expense_total: "300.00",
          income_categories: [
            {
              category_id: "salary",
              category_name: "เงินเดือน",
              category_color: "#059669",
              amount: "1000.00",
            },
          ],
          expense_categories: [
            {
              category_id: "food",
              category_name: "อาหาร",
              category_color: "#DC2626",
              amount: "120.00",
            },
            {
              category_id: null,
              category_name: "Uncategorized",
              category_color: null,
              amount: "180.00",
            },
          ],
        },
      ],
    });

    const chart = buildDashboardChartData(overview, ["food"]);

    expect(chart.rows).toEqual([
      {
        date: "2026-07-20",
        income_total: 1000,
        expense_total: 300,
        "income-salary": 1000,
        "expense-other": 120,
        "expense-uncategorized": 180,
      },
    ]);
    expect(chart.incomeSegments).toMatchObject([
      { key: "income-salary", label: "เงินเดือน", type: "income" },
    ]);
    expect(chart.expenseSegments).toMatchObject([
      { key: "expense-uncategorized", label: "ไม่ระบุหมวดหมู่", type: "expense" },
      { key: "expense-other", label: "อื่นๆ", type: "expense" },
    ]);
  });
});
