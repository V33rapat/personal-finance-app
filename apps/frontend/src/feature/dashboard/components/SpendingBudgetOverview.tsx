"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import { useWallet } from "@/feature/wallet/hooks/useWallet";
import {
  formatSpendingBudgetPeriodSelection,
  type SpendingBudgetPeriod,
} from "../lib/spendingBudget";
import { useSpendingBudget } from "../hooks/useSpendingBudget";
import SpendingBudgetCard from "./SpendingBudgetCard";
import SpendingBudgetManagementModal from "./SpendingBudgetManagementModal";
import SpendingBudgetPeriodPicker from "./SpendingBudgetPeriodPicker";

const periodOptions: Array<{ value: SpendingBudgetPeriod; label: string }> = [
  { value: "daily", label: TH_TEXT.budget.daily },
  { value: "weekly", label: TH_TEXT.budget.weekly },
  { value: "monthly", label: TH_TEXT.budget.monthly },
  { value: "yearly", label: TH_TEXT.budget.yearly },
];

function BudgetCardSkeleton() {
  return (
    <div className="min-h-[220px] animate-pulse border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70" />
  );
}

export default function SpendingBudgetOverview() {
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const { wallets, isLoading: isLoadingWallets } = useWallet();
  const {
    selectedPeriod,
    selectedPeriodSelection,
    budgets,
    overview,
    isLoadingBudgets,
    isLoadingOverview,
    isSaving,
    error,
    setSelectedPeriod,
    setPeriodSelection,
    resetPeriodSelection,
    createBudget,
    updateBudget,
    setBudgetActive,
    deleteBudget,
    reload,
  } = useSpendingBudget();
  const rangeLabel = formatSpendingBudgetPeriodSelection(
    selectedPeriodSelection,
  );

  return (
    <section
      aria-labelledby="spending-budget-heading"
      className="border-t border-slate-100 pt-6 dark:border-slate-800"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="spending-budget-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-50"
          >
            {TH_TEXT.budget.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {rangeLabel}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsManagementOpen(true)}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          {TH_TEXT.budget.manage}
        </Button>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label={TH_TEXT.budget.period}
          className="inline-flex min-h-[42px] max-w-full overflow-x-auto border border-slate-200 p-1 dark:border-slate-700"
        >
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selectedPeriod === option.value}
              onClick={() => setSelectedPeriod(option.value)}
              disabled={isSaving}
              className={[
                "shrink-0 px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                selectedPeriod === option.value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
        <SpendingBudgetPeriodPicker
          selection={selectedPeriodSelection}
          disabled={isSaving}
          onApply={setPeriodSelection}
          onReset={() => resetPeriodSelection(selectedPeriod)}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex flex-col gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoadingOverview || isLoadingBudgets}
            onClick={() => void reload()}
          >
            {TH_TEXT.dashboard.retry}
          </Button>
        </div>
      )}

      <div className="mt-5" aria-busy={isLoadingOverview}>
        {isLoadingOverview && !overview ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <BudgetCardSkeleton />
            <BudgetCardSkeleton />
            <BudgetCardSkeleton />
          </div>
        ) : overview?.budgets.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overview.budgets.map((budget) => (
              <SpendingBudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {TH_TEXT.budget.noBudgetsTitle}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {TH_TEXT.budget.noBudgetsDescription}
            </p>
            <Button
              className="mt-5"
              size="sm"
              onClick={() => setIsManagementOpen(true)}
            >
              {TH_TEXT.budget.create}
            </Button>
          </div>
        )}
      </div>

      {isManagementOpen && (
        <SpendingBudgetManagementModal
          isOpen
          budgets={budgets}
          isLoading={isLoadingBudgets}
          isSaving={isSaving}
          error={error}
          wallets={wallets}
          isLoadingWallets={isLoadingWallets}
          onClose={() => setIsManagementOpen(false)}
          onCreate={createBudget}
          onUpdate={updateBudget}
          onSetActive={setBudgetActive}
          onDelete={deleteBudget}
        />
      )}
    </section>
  );
}
