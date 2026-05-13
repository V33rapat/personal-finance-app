"use client";

import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";

interface TransactionBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onClear: () => void;
  onSelectAll?: () => void;
}

export default function TransactionBulkActionBar({ selectedCount, totalCount, onDelete, onClear, onSelectAll }: TransactionBulkActionBarProps) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/30">
      <div className="flex items-center gap-3">
        <button
          onClick={onSelectAll}
          className={[
            "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150",
            isAllSelected
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-slate-400 hover:border-violet-400 dark:border-slate-500",
          ].join(" ")}
          aria-label={isAllSelected ? "Clear all" : "Select all"}
        >
          {isAllSelected && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-6" />
            </svg>
          )}
        </button>
        <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
          {selectedCount} {selectedCount === 1 ? "รายการถูกเลือก" : "รายการถูกเลือก"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          {TH_TEXT.common.cancel}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          {TH_TEXT.transaction.deleteSelected ?? "ลบรายการ"}
        </Button>
      </div>
    </div>
  );
}