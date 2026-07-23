import type {
  DashboardCategoryAmount,
  DashboardOverview,
  DashboardTransactionType,
} from "../hooks/useDashboardOverview";

const INCOME_COLORS = ["#059669", "#10B981", "#34D399", "#047857", "#6EE7B7"];
const EXPENSE_COLORS = ["#DC2626", "#E11D48", "#F43F5E", "#BE123C", "#FDA4AF"];

export interface DashboardChartSegment {
  key: string;
  label: string;
  color: string;
  type: DashboardTransactionType;
}

export interface DashboardChartDatum {
  date: string;
  income_total: number;
  expense_total: number;
  [key: string]: number | string;
}

export interface DashboardCategoryBreakdown {
  key: string;
  label: string;
  amount: number;
  type: DashboardTransactionType;
}

function getCategoryGroup(
  category: DashboardCategoryAmount,
  type: DashboardTransactionType,
  hiddenCategoryIds: Set<string>
) {
  if (!category.category_id) {
    return { key: `${type}-uncategorized`, label: "ไม่ระบุหมวดหมู่" };
  }

  if (hiddenCategoryIds.has(category.category_id)) {
    return { key: `${type}-other`, label: "อื่นๆ" };
  }

  return { key: `${type}-${category.category_id}`, label: category.category_name };
}

function buildSegmentColor(type: DashboardTransactionType, index: number) {
  const colors = type === "income" ? INCOME_COLORS : EXPENSE_COLORS;
  return colors[index % colors.length];
}

export function buildDashboardChartData(
  overview: DashboardOverview,
  hiddenCategoryIds: string[]
) {
  const hiddenCategoryIdSet = new Set(hiddenCategoryIds);
  const segmentTotals = new Map<string, DashboardCategoryBreakdown>();
  const rows = overview.days.map((day) => {
    const row: DashboardChartDatum = {
      date: day.date,
      income_total: Number(day.income_total),
      expense_total: -Number(day.expense_total),
    };

    for (const type of ["income", "expense"] as const) {
      const categories = type === "income" ? day.income_categories : day.expense_categories;

      for (const category of categories) {
        const group = getCategoryGroup(category, type, hiddenCategoryIdSet);
        const amount = Number(category.amount);
        const signedAmount = type === "income" ? amount : -amount;
        row[group.key] = Number(row[group.key] ?? 0) + signedAmount;
        const existing = segmentTotals.get(group.key);

        segmentTotals.set(group.key, {
          key: group.key,
          label: group.label,
          amount: (existing?.amount ?? 0) + amount,
          type,
        });
      }
    }

    return row;
  });
  const categorySegments = [...segmentTotals.values()]
    .sort((first, second) => second.amount - first.amount)
    .map((segment, index) => ({
      key: segment.key,
      label: segment.label,
      color: buildSegmentColor(segment.type, index),
      type: segment.type,
    }));

  return {
    rows,
    incomeSegments: categorySegments.filter((segment) => segment.type === "income"),
    expenseSegments: categorySegments.filter((segment) => segment.type === "expense"),
  };
}

export function buildExpenseBreakdown(
  overview: DashboardOverview,
  hiddenCategoryIds: string[]
) {
  const hiddenCategoryIdSet = new Set(hiddenCategoryIds);
  const categories = new Map<string, DashboardCategoryBreakdown>();

  for (const category of overview.expense_categories) {
    const group = getCategoryGroup(category, "expense", hiddenCategoryIdSet);
    const existing = categories.get(group.key);

    categories.set(group.key, {
      key: group.key,
      label: group.label,
      amount: (existing?.amount ?? 0) + Number(category.amount),
      type: "expense",
    });
  }

  return [...categories.values()].sort((first, second) => second.amount - first.amount);
}
