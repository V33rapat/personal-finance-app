"use client";

import { TH_TEXT } from "@/constants/th";
import type { TransactionType } from "./TransactionItem";

interface Category {
  id: string;
  name: string;
}

interface TransactionFilterProps {
  wallets: { id: string; name: string }[];
  categories: Category[];
  selectedWalletId?: string;
  selectedType?: TransactionType | "";
  selectedCategoryId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  onWalletChange?: (walletId: string) => void;
  onTypeChange?: (type: TransactionType | "") => void;
  onCategoryChange?: (categoryId: string) => void;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  onSearchChange?: (query: string) => void;
}

export default function TransactionFilter({
  wallets,
  categories,
  selectedWalletId = "",
  selectedType = "",
  selectedCategoryId = "",
  startDate = "",
  endDate = "",
  searchQuery = "",
  onWalletChange,
  onTypeChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
}: TransactionFilterProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedWalletId}
          onChange={(e) => onWalletChange?.(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">{TH_TEXT.transaction.allWallets}</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => onTypeChange?.(e.target.value as TransactionType | "")}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">{TH_TEXT.transaction.allTypes}</option>
          <option value="income">{TH_TEXT.transaction.income}</option>
          <option value="expense">{TH_TEXT.transaction.expense}</option>
        </select>

        <select
          value={selectedCategoryId}
          onChange={(e) => onCategoryChange?.(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">{TH_TEXT.transaction.allCategories}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange?.(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange?.(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329c.141.14.361.204.53.204a.75.75 0 00.53-.204l3.328-3.329A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={TH_TEXT.transaction.searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}