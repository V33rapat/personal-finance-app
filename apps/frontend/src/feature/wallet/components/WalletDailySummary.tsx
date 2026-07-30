import { TH_TEXT } from "@/constants/th";
import type { DailyTransactionSummary } from "../hooks/useWalletDailyTransactions";

interface WalletDailySummaryProps {
  summary: DailyTransactionSummary;
}

function formatMoney(value: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function WalletDailySummary({ summary }: WalletDailySummaryProps) {
  const values = [
    { label: TH_TEXT.transaction.dailyIncome, value: summary.income, className: "text-emerald-600 dark:text-emerald-400" },
    { label: TH_TEXT.transaction.dailyExpense, value: summary.expense, className: "text-rose-600 dark:text-rose-400" },
    { label: TH_TEXT.transaction.dailyNet, value: summary.net, className: "text-slate-900 dark:text-slate-50" },
  ];

  return (
    <section aria-label={TH_TEXT.transaction.dailySummary} className="mb-5 grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/40">
      {values.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
          <p className={`mt-1 text-lg font-bold ${item.className}`}>{formatMoney(item.value)}</p>
        </div>
      ))}
    </section>
  );
}
