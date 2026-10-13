"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  type XAxisTickContentProps,
  YAxis,
} from "recharts";
import { TH_TEXT } from "@/constants/th";
import type { DashboardOverview } from "../hooks/useDashboardOverview";
import { buildDashboardChartData } from "../lib/overview";
import { formatCompactDate, formatDisplayDate } from "@/lib/dateFormat";

interface DashboardBarChartProps {
  overview: DashboardOverview;
  hiddenCategoryIds: string[];
  isCategoryBreakdownEnabled: boolean;
  visibleTransactionType: DashboardChartTransactionType;
}

export type DashboardChartTransactionType = "all" | "income" | "expense";

interface DashboardChartTooltipProps extends TooltipContentProps {
  visibleTransactionType: DashboardChartTransactionType;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisDate(value: string) {
  return formatCompactDate(value);
}

function formatAxisAmount(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1000) {
    return `฿${(absoluteValue / 1000).toFixed(0)}k`;
  }

  return `฿${absoluteValue.toFixed(0)}`;
}

function DashboardDateTick({ x, y, payload }: XAxisTickContentProps) {
  const date = String(payload.value);

  return (
    <text
      data-testid={`dashboard-overview-chart-date-${date}`}
      x={x}
      y={y}
      dy={12}
      fill="#64748b"
      fontSize={12}
      textAnchor="middle"
    >
      {formatAxisDate(date)}
    </text>
  );
}

function DashboardChartTooltip({
  active,
  label,
  payload,
  visibleTransactionType,
}: DashboardChartTooltipProps) {
  if (!active || payload.length === 0) {
    return null;
  }

  const entries = payload.filter((item) => Number(item.value ?? 0) !== 0);

  const totals = payload.reduce(
    (current, item) => {
      const value = Math.abs(Number(item.value ?? 0));

      if (String(item.dataKey).startsWith("income")) {
        current.income += value;
      } else {
        current.expense += value;
      }

      return current;
    },
    { income: 0, expense: 0 }
  );
  const shouldShowIncome = visibleTransactionType !== "expense";
  const shouldShowExpense = visibleTransactionType !== "income";
  const net = totals.income - totals.expense;

  return (
    <div
      data-testid="dashboard-overview-chart-tooltip"
      className="min-w-48 rounded-lg border border-[var(--dashboard-tooltip-border)] bg-[var(--dashboard-tooltip-background)] px-3 py-2 text-sm text-[var(--dashboard-tooltip-foreground)] shadow-lg"
    >
      <p className="mb-2 font-medium">{formatDisplayDate(String(label))}</p>
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((item) => (
            <div key={String(item.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </span>
              <span>{formatCurrency(Math.abs(Number(item.value ?? 0)))}</span>
            </div>
          ))}
        </div>
      )}
      <div className="my-2 border-t border-[var(--dashboard-tooltip-border)]" />
      <div className="space-y-1 font-semibold">
        {shouldShowIncome && (
          <div
            data-testid="dashboard-overview-chart-total-income"
            className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400"
          >
            <span>{TH_TEXT.dashboard.totalIncome}</span>
            <span>{formatCurrency(totals.income)}</span>
          </div>
        )}
        {shouldShowExpense && (
          <div
            data-testid="dashboard-overview-chart-total-expense"
            className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400"
          >
            <span>{TH_TEXT.dashboard.totalExpense}</span>
            <span>{formatCurrency(totals.expense)}</span>
          </div>
        )}
        {visibleTransactionType === "all" && (
          <div
            data-testid="dashboard-overview-chart-total-net"
            className="flex items-center justify-between gap-4"
          >
            <span>{TH_TEXT.dashboard.net}</span>
            <span>{formatCurrency(net)}</span>
          </div>
        )}
      </div>
    </div>
  );
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
    <div
      data-testid="dashboard-overview-chart"
      className="h-[300px] w-full"
      aria-label={TH_TEXT.dashboard.incomeExpenseChart}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#cbd5e1" strokeOpacity={0.38} />
          <XAxis
            dataKey="date"
            tick={DashboardDateTick}
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
            shared
            filterNull={false}
            content={(props) => (
              <DashboardChartTooltip
                {...props}
                visibleTransactionType={visibleTransactionType}
              />
            )}
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
