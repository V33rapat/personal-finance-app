"use client";

import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import type { MoneyAllocation } from "../hooks/useAllocation";
import { formatWalletMoney } from "../lib/allocationWallet";

interface AllocationHistoryProps {
  allocations: MoneyAllocation[];
  isLoading: boolean;
  isSaving: boolean;
  editingAllocationId: string | null;
  onEdit: (allocation: MoneyAllocation) => void;
  onDelete: (allocation: MoneyAllocation) => void;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function AllocationHistory({
  allocations,
  isLoading,
  isSaving,
  editingAllocationId,
  onEdit,
  onDelete,
}: AllocationHistoryProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.allocation.historyTitle}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.allocation.historyDescription}
        </p>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : allocations.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {TH_TEXT.allocation.historyEmptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.allocation.historyEmptyDescription}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {allocations.map((allocation) => {
            const isEditing = allocation.id === editingAllocationId;

            return (
              <article
                key={allocation.id}
                className={[
                  "rounded-xl border p-4 transition",
                  isEditing
                    ? "border-violet-300 bg-violet-50/70 ring-2 ring-violet-200 dark:border-violet-700 dark:bg-violet-950/20 dark:ring-violet-900/70"
                    : "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/30",
                ].join(" ")}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_auto] lg:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {TH_TEXT.allocation.sourceWallet}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {allocation.source_wallet_name}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                      {formatWalletMoney(allocation.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {TH_TEXT.allocation.destinationPanel}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allocation.destinations.map((destination) => (
                        <span
                          key={destination.transfer_id}
                          className="max-w-full truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          title={`${destination.wallet_name} ${formatWalletMoney(destination.amount)}`}
                        >
                          {destination.wallet_name} ({formatWalletMoney(destination.amount)})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {TH_TEXT.allocation.date}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {formatDate(allocation.allocation_date)}
                    </p>
                    <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                      {allocation.note || TH_TEXT.common.none}
                    </p>
                  </div>

                  <div className="flex gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant={isEditing ? "primary" : "secondary"}
                      size="sm"
                      disabled={isSaving}
                      onClick={() => onEdit(allocation)}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 4 13.172V16h2.828l7.379-7.379-2.828-2.828Z" />
                      </svg>
                      {TH_TEXT.common.edit}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => onDelete(allocation)}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3.75a.75.75 0 0 0 0 1.5h.3l.64 10.243A2.75 2.75 0 0 0 7.434 18h5.132a2.75 2.75 0 0 0 2.744-2.257L15.95 5.5h.3a.75.75 0 0 0 0-1.5H14v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 4v-.25c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25V4h-5Z" clipRule="evenodd" />
                      </svg>
                      {TH_TEXT.common.delete}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
