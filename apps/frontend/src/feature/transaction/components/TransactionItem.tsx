"use client";

import { TH_TEXT } from "@/constants/th";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  wallet_id: string;
  wallet_name?: string;
  category_id: string | null;
  category_name?: string;
  name: string;
  type: TransactionType;
  amount: string;
  note: string | null;
  transaction_date: string;
  created_at: string;
}

interface TransactionItemProps {
  transaction: Transaction;
  showWallet?: boolean;
  currency?: string;
}

function formatMoney(amount: string, currency: string = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TransactionItem({ transaction, showWallet = false, currency = "THB" }: TransactionItemProps) {
  const isIncome = transaction.type === "income";

  return (
    <div className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isIncome ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
        ].join(" ")}
      >
        {isIncome ? (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l.75.75 4.69-4.69a.75.75 0 01.53-.919z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l.75.75 4.69-4.69a.75.75 0 01.53-.919z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{transaction.name}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {showWallet && transaction.wallet_name && (
            <>
              <span>{transaction.wallet_name}</span>
              <span>·</span>
            </>
          )}
          <span>{formatDate(transaction.transaction_date)}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className={["font-semibold", isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"].join(" ")}>
          {isIncome ? "+" : "-"}
          {formatMoney(transaction.amount, currency)}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {isIncome ? TH_TEXT.transaction.income : TH_TEXT.transaction.expense}
        </p>
      </div>
    </div>
  );
}