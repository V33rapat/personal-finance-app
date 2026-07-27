import Card from "@/components/ui/Card";
import { TH_TEXT } from "@/constants/th";
import type { SpendingBudgetOverview } from "../hooks/useSpendingBudget";
import { getSpendingBudgetProgress, type SpendingBudgetStatus } from "../lib/spendingBudget";

function formatCurrency(value: string) {
  const amount = Number(value);

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

const statusStyles: Record<SpendingBudgetStatus, { bar: string; text: string }> = {
  on_track: {
    bar: "bg-emerald-500 dark:bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  near_limit: {
    bar: "bg-amber-500 dark:bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
  },
  over_budget: {
    bar: "bg-rose-600 dark:bg-rose-400",
    text: "text-rose-700 dark:text-rose-300",
  },
};

function getStatusLabel(status: SpendingBudgetStatus) {
  if (status === "over_budget") {
    return TH_TEXT.budget.overBudget;
  }

  if (status === "near_limit") {
    return TH_TEXT.budget.nearLimit;
  }

  return TH_TEXT.budget.onTrack;
}

function getWalletScopeLabel(budget: SpendingBudgetOverview) {
  if (budget.wallet_scope === "all") {
    return TH_TEXT.budget.allWallets;
  }

  const firstWallet = budget.wallets[0];

  if (!firstWallet) {
    return TH_TEXT.budget.selectedWallets;
  }

  const firstWalletLabel = firstWallet.parent_name
    ? `${firstWallet.parent_name}: ${firstWallet.name}`
    : firstWallet.name;

  return budget.wallets.length === 1
    ? firstWalletLabel
    : `${firstWalletLabel} +${budget.wallets.length - 1}`;
}

export default function SpendingBudgetCard({ budget }: { budget: SpendingBudgetOverview }) {
  const statusStyle = statusStyles[budget.status];
  const progress = getSpendingBudgetProgress(budget.percentage);
  const categoryNames = [
    ...budget.categories.map((category) => category.name),
    ...(budget.includes_uncategorized ? [TH_TEXT.budget.uncategorized] : []),
  ];
  const isOverBudget = Number(budget.remaining) < 0;

  return (
    <Card className="min-h-[244px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
            {budget.name}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {categoryNames.join(", ")}
          </p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {getWalletScopeLabel(budget)}
          </p>
          {budget.unavailable_wallet_count > 0 && (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              {TH_TEXT.budget.unavailableWalletsCount.replace(
                "%s",
                String(budget.unavailable_wallet_count),
              )}
            </p>
          )}
        </div>
        <span className={["shrink-0 text-xs font-semibold", statusStyle.text].join(" ")}>
          {getStatusLabel(budget.status)}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {formatCurrency(budget.spent)}
          </p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            / {formatCurrency(budget.amount)}
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label={budget.name}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className={["h-full rounded-full transition-[width] duration-300", statusStyle.bar].join(" ")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
        <span className="text-slate-500 dark:text-slate-400">
          {isOverBudget ? TH_TEXT.budget.overBudget : TH_TEXT.budget.remaining}
        </span>
        <span className={["font-bold", statusStyle.text].join(" ")}>
          {formatCurrency(isOverBudget ? String(Math.abs(Number(budget.remaining))) : budget.remaining)}
        </span>
      </div>
    </Card>
  );
}
