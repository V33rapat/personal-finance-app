"use client";

import { TH_TEXT } from "@/constants/th";
import type { Transaction, TransactionType } from "./TransactionItem";

interface TransactionRowProps {
  transaction: Transaction;
  showWallet?: boolean;
  currency?: string;
  onEdit?: (transaction: Transaction) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
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

export default function TransactionRow({
  transaction,
  showWallet = false,
  currency = "THB",
  onEdit,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
}: TransactionRowProps) {
  const isIncome = transaction.type === "income";

  return (
    <div
      className={[
        "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150",
        isSelected ? "bg-violet-50/50 dark:bg-violet-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
      ].join(" ")}
    >
      {onToggleSelect ? (
        <button
          onClick={() => onToggleSelect(transaction.id)}
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150",
            isSelected
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-slate-300 hover:border-violet-400 dark:border-slate-600",
          ].join(" ")}
          aria-label={isSelected ? "Unselect" : "Select"}
        >
          {isSelected && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-6" />
            </svg>
          )}
        </button>
      ) : (
        <div className="h-5 w-5 shrink-0" />
      )}

      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isIncome ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
        ].join(" ")}
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l.75.75 4.69-4.69a.75.75 0 01.53-.919z" clipRule="evenodd" />
        </svg>
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

      <div className="shrink-0 flex items-center gap-2">
        <div className="text-right">
          <p className={["font-semibold", isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"].join(" ")}>
            {isIncome ? "+" : "-"}
            {formatMoney(transaction.amount, currency)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isIncome ? TH_TEXT.transaction.income : TH_TEXT.transaction.expense}
          </p>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(transaction)}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label={TH_TEXT.common.edit}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}