"use client";

import { TH_TEXT } from "@/constants/th";
import { formatCurrency } from "@/lib/currencyFormat";
import { formatDisplayDate } from "@/lib/dateFormat";
import type { Transaction } from "./TransactionItem";
import TransactionActionMenu from "./TransactionActionMenu";

interface TransactionRowProps {
  transaction: Transaction;
  showWallet?: boolean;
  currency?: string;
  onEdit?: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onSaveAsTemplate?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  isSavingTemplate?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function TransactionRow({
  transaction,
  showWallet = false,
  currency = "THB",
  onEdit,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  isSavingTemplate = false,
  isSelected = false,
  onToggleSelect,
}: TransactionRowProps) {
  const isIncome = transaction.type === "income";
  const isManaged = transaction.management && transaction.management !== "manual";
  const managementLabel =
    transaction.management === "allocation"
      ? TH_TEXT.transaction.managedAllocation
      : TH_TEXT.transaction.managedTransfer;

  return (
    <div
      data-testid="daily-transaction-row"
      data-management={transaction.management ?? "manual"}
      className={[
        "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150",
        isSelected ? "bg-violet-50/50 dark:bg-violet-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
      ].join(" ")}
    >
      {onToggleSelect && !isManaged ? (
        <button
          onClick={() => onToggleSelect(transaction.id)}
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150",
            isSelected
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-slate-300 hover:border-violet-400 dark:border-slate-600",
          ].join(" ")}
          aria-label={`${isSelected ? "ยกเลิกการเลือก" : "เลือกรายการ"}: ${transaction.name}`}
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
        <p
          data-testid="daily-transaction-name"
          className="truncate font-medium text-slate-800 dark:text-slate-100"
        >
          {transaction.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {showWallet && transaction.wallet_name && (
            <>
              <span>{transaction.wallet_name}</span>
              <span>·</span>
            </>
          )}
          <span>{formatDisplayDate(transaction.transaction_date)}</span>
          {isManaged && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {managementLabel}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <div className="text-right">
          <p className={["font-semibold", isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"].join(" ")}>
            {isIncome ? "+" : "-"}
            {formatCurrency(transaction.amount, currency)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isIncome ? TH_TEXT.transaction.income : TH_TEXT.transaction.expense}
          </p>
        </div>
        <TransactionActionMenu
          transaction={transaction}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onSaveAsTemplate={onSaveAsTemplate}
          onDelete={onDelete}
          isSavingTemplate={isSavingTemplate}
        />
      </div>
    </div>
  );
}
