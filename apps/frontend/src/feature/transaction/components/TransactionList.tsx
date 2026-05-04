"use client";

import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import type { Transaction } from "./TransactionItem";
import TransactionItem from "./TransactionItem";

interface TransactionListProps {
  transactions: Transaction[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  showWallet?: boolean;
  currency?: string;
  empty?: boolean;
}

export default function TransactionList({
  transactions,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  showWallet = false,
  currency = "THB",
  empty = false,
}: TransactionListProps) {
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{TH_TEXT.transaction.noTransactions}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{TH_TEXT.transaction.noTransactionsDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} showWallet={showWallet} currency={currency} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-4">
          <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {TH_TEXT.transaction.loadMore}
              </span>
            ) : (
              TH_TEXT.transaction.showMore
            )}
          </Button>
        </div>
      )}
    </div>
  );
}