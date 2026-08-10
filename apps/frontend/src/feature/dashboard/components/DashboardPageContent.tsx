"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TH_TEXT } from "@/constants/th";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import DashboardWalletSummary from "./DashboardWalletSummary";
import SpendingBudgetOverview from "./SpendingBudgetOverview";
import DashboardWeeklyOverview from "./DashboardWeeklyOverview";
import DashboardSpendingPlans from "@/feature/spending-plan/components/DashboardSpendingPlans";

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) {
    return "";
  }

  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatCurrency(value: string | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

interface SummaryCardProps {
  label: string;
  value: string;
  isLoading: boolean;
}

function SummaryCard({ label, value, isLoading }: SummaryCardProps) {
  return (
    <Card className="min-h-[118px] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      {isLoading ? (
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      ) : (
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </p>
      )}
    </Card>
  );
}

export default function DashboardPageContent() {
  const {
    summary,
    selectedMonth,
    currentMonth,
    isLoading,
    error,
    selectMonth,
    retry,
  } = useDashboardSummary();
  const monthLabel = formatMonth(selectedMonth);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {TH_TEXT.dashboard.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {TH_TEXT.dashboard.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.dashboard.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:w-[190px]">
          <label
            htmlFor="dashboard-reporting-month"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            {TH_TEXT.dashboard.reportingPeriod}
          </label>
          <input
            id="dashboard-reporting-month"
            type="month"
            value={selectedMonth}
            max={currentMonth}
            onChange={(event) => selectMonth(event.target.value)}
            className="h-[46px] w-full rounded-xl border border-slate-200 bg-white/60 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-500/20"
          />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <Button variant="secondary" size="sm" disabled={isLoading} onClick={retry}>
            {TH_TEXT.dashboard.retry}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
        <SummaryCard
          label={`${TH_TEXT.dashboard.totalBalanceForMonth} ${monthLabel}`}
          value={formatCurrency(summary?.total_balance)}
          isLoading={isLoading}
        />
        <SummaryCard
          label={`${TH_TEXT.dashboard.monthlySpendingForMonth} ${monthLabel}`}
          value={formatCurrency(summary?.monthly_spending)}
          isLoading={isLoading}
        />
        <SummaryCard
          label={TH_TEXT.dashboard.activeWallets}
          value={String(summary?.active_wallet_count ?? 0)}
          isLoading={isLoading}
        />
      </div>

      <DashboardWalletSummary />
      <DashboardSpendingPlans />
      <DashboardWeeklyOverview />
      <SpendingBudgetOverview />
    </div>
  );
}
