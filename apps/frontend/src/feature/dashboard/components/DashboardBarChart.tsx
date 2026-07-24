"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TH_TEXT } from "@/constants/th";
import type { DashboardOverview } from "../hooks/useDashboardOverview";
import { buildDashboardChartData } from "../lib/overview";
import { toUtcDate } from "../lib/date";

interface DashboardBarChartProps {
  overview: DashboardOverview;
  hiddenCategoryIds: string[];
  isCategoryBreakdownEnabled: boolean;
  visibleTransactionType: DashboardChartTransactionType;
}

export type DashboardChartTransactionType = "all" | "income" | "expense";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toUtcDate(value));
}

function formatAxisAmount(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1000) {
    return `฿${(absoluteValue / 1000).toFixed(0)}k`;
  }

  return `฿${absoluteValue.toFixed(0)}`;
}

export default function DashboardBarChart({
  overview,
  hiddenCategoryIds,
  isCategoryBreakdownEnabled,
  visibleTransactionType,
}: DashboardBarChartProps) {
  const { rows, incomeSegments, expenseSegments } = buildDashboardChartData(
    overview,
    hiddenCategoryIds
  );
  const hasTransactions = rows.some(
    (row) =>
      (visibleTransactionType !== "expense" && Number(row.income_total) !== 0) ||
      (visibleTransactionType !== "income" && Number(row.expense_total) !== 0)
  );
  const shouldShowIncome = visibleTransactionType !== "expense";
  const shouldShowExpense = visibleTransactionType !== "income";

  if (!hasTransactions) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        {TH_TEXT.dashboard.noTransactionsInPeriod}
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full" aria-label={TH_TEXT.dashboard.incomeExpenseChart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#cbd5e1" strokeOpacity={0.38} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatAxisAmount}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.75} />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.14)" }}
            labelFormatter={(label) => formatAxisDate(String(label))}
            formatter={(value, name) => [formatCurrency(Math.abs(Number(value))), name]}
            contentStyle={{
              border: "1px solid var(--dashboard-tooltip-border)",
              borderRadius: "8px",
              background: "var(--dashboard-tooltip-background)",
              color: "var(--dashboard-tooltip-foreground)",
            }}
          />
          {isCategoryBreakdownEnabled ? (
            <>
              {shouldShowIncome && incomeSegments.map((segment) => (
                <Bar
                  key={segment.key}
                  dataKey={segment.key}
                  name={segment.label}
                  fill={segment.color}
                  stackId="income"
                  radius={[3, 3, 0, 0]}
                />
              ))}
              {shouldShowExpense && expenseSegments.map((segment) => (
                <Bar
                  key={segment.key}
                  dataKey={segment.key}
                  name={segment.label}
                  fill={segment.color}
                  stackId="expense"
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </>
          ) : (
            <>
              {shouldShowIncome && (
                <Bar
                  dataKey="income_total"
                  name={TH_TEXT.dashboard.income}
                  fill="#059669"
                  radius={[3, 3, 0, 0]}
                />
              )}
              {shouldShowExpense && (
                <Bar
                  dataKey="expense_total"
                  name={TH_TEXT.dashboard.expense}
                  fill="#DC2626"
                  radius={[3, 3, 0, 0]}
                />
              )}
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
