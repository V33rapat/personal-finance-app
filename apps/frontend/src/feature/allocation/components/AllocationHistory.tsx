"use client";

import { TH_TEXT } from "@/constants/th";
import type { MoneyAllocation } from "../hooks/useAllocation";
import { formatWalletMoney } from "../lib/allocationWallet";
import AllocationActionMenu from "./AllocationActionMenu";

interface AllocationHistoryProps {
  allocations: MoneyAllocation[];
  isLoading: boolean;
  isSaving: boolean;
  onEdit: (allocation: MoneyAllocation) => void;
  onDuplicate: (allocation: MoneyAllocation) => void;
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
  onEdit,
  onDuplicate,
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
            return (
              <article
                key={allocation.id}
                data-testid="allocation-history-row"
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition dark:border-slate-800 dark:bg-slate-950/30"
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

                  <AllocationActionMenu
                    label={TH_TEXT.allocation.actionsFor.replace("%s", formatDate(allocation.allocation_date))}
                    disabled={isSaving}
                    onEdit={() => onEdit(allocation)}
                    onDuplicate={() => onDuplicate(allocation)}
                    onDelete={() => onDelete(allocation)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
