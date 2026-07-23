"use client";

import { BarChart3, Layers3 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TH_TEXT } from "@/constants/th";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { formatThaiDateRange } from "../lib/date";
import { buildExpenseBreakdown } from "../lib/overview";
import DashboardBarChart from "./DashboardBarChart";
import DashboardCategorySettings from "./DashboardCategorySettings";
import DashboardDateRangePicker from "./DashboardDateRangePicker";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function OverviewSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-11 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-[300px] animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-[300px] animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
      </div>
    </Card>
  );
}

export default function DashboardWeeklyOverview() {
  const {
    preferences,
    overview,
    isLoading,
    isSaving,
    error,
    updateRange,
    resetToCurrentWeek,
    setCategoryBreakdownEnabled,
    setCategoryHidden,
    showAllCategories,
    retry,
  } = useDashboardOverview();

  if (!preferences || !overview) {
    if (error) {
      return (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="secondary" size="sm" onClick={retry} disabled={isLoading}>
              {TH_TEXT.dashboard.retry}
            </Button>
          </div>
        </Card>
      );
    }

    return <OverviewSkeleton />;
  }

  const expenseBreakdown = buildExpenseBreakdown(
    overview,
    preferences.hidden_category_ids
  );
  const rangeLabel = formatThaiDateRange(preferences.period_start, preferences.period_end);

  return (
    <Card className="p-5 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {TH_TEXT.dashboard.weeklyOverview}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{rangeLabel}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[250px]">
            <DashboardDateRangePicker
              range={{ start: preferences.period_start, end: preferences.period_end }}
              disabled={isSaving}
              onApply={updateRange}
              onReset={resetToCurrentWeek}
            />
          </div>
          <div className="inline-flex h-[46px] w-full border border-slate-200 p-1 dark:border-slate-700 sm:w-auto">
            <button
              type="button"
              onClick={() => setCategoryBreakdownEnabled(false)}
              disabled={isSaving}
              className={[
                "flex flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                !preferences.is_category_breakdown_enabled
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              <BarChart3 className="h-4 w-4" aria-hidden />
              {TH_TEXT.dashboard.totalView}
            </button>
            <button
              type="button"
              onClick={() => setCategoryBreakdownEnabled(true)}
              disabled={isSaving}
              className={[
                "flex flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                preferences.is_category_breakdown_enabled
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              <Layers3 className="h-4 w-4" aria-hidden />
              {TH_TEXT.dashboard.categoryView}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={retry} disabled={isLoading}>
            {TH_TEXT.dashboard.retry}
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0" aria-busy={isLoading}>
          {isLoading ? (
            <div className="h-[300px] animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
          ) : (
            <DashboardBarChart
              overview={overview}
              hiddenCategoryIds={preferences.hidden_category_ids}
              isCategoryBreakdownEnabled={preferences.is_category_breakdown_enabled}
            />
          )}
        </section>

        <aside className="border-t border-slate-100 pt-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              {TH_TEXT.dashboard.expenseByCategory}
            </h3>
            <DashboardCategorySettings
              overview={overview}
              hiddenCategoryIds={preferences.hidden_category_ids}
              isSaving={isSaving}
              onHiddenChange={setCategoryHidden}
              onShowAll={showAllCategories}
            />
          </div>

          {expenseBreakdown.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.dashboard.noExpensesInPeriod}
            </p>
          ) : (
            <ul className="mt-4 max-h-[248px] space-y-1 overflow-y-auto pr-1">
              {expenseBreakdown.map((category) => (
                <li
                  key={category.key}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                    {category.label}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-50">
                    {formatCurrency(category.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <dl className="mt-6 grid grid-cols-1 divide-y border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="py-4 sm:px-4 sm:first:pl-0">
          <dt className="text-sm text-slate-500 dark:text-slate-400">{TH_TEXT.dashboard.income}</dt>
          <dd className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(overview.totals.income)}
          </dd>
        </div>
        <div className="py-4 sm:px-4">
          <dt className="text-sm text-slate-500 dark:text-slate-400">{TH_TEXT.dashboard.expense}</dt>
          <dd className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">
            {formatCurrency(overview.totals.expense)}
          </dd>
        </div>
        <div className="py-4 sm:px-4 sm:pr-0">
          <dt className="text-sm text-slate-500 dark:text-slate-400">{TH_TEXT.dashboard.net}</dt>
          <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
            {formatCurrency(overview.totals.net)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
