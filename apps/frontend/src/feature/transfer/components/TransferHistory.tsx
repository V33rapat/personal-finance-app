"use client";

import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import type { Transfer } from "../hooks/useTransfer";

interface TransferHistoryProps {
  transfers: Transfer[];
  isLoading: boolean;
  isSaving: boolean;
  editingTransferId?: string | null;
  onEdit: (transfer: Transfer) => void;
  onDelete: (transfer: Transfer) => void;
}

function formatMoney(amount: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date || TH_TEXT.common.none;
  }

  return `${day}/${month}/${year}`;
}

function getTransferLabel(transfer: Transfer) {
  const source = transfer.sourceWalletName || TH_TEXT.transfer.sourceWallet;
  const destination =
    transfer.destinationWalletName || TH_TEXT.transfer.destinationWallet;

  return `${source} -> ${destination}`;
}

function TransferHistorySkeleton() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-28 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30"
        />
      ))}
    </div>
  );
}

export default function TransferHistory({
  transfers,
  isLoading,
  isSaving,
  editingTransferId,
  onEdit,
  onDelete,
}: TransferHistoryProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.transfer.historyTitle}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.transfer.historyDescription}
        </p>
      </div>

      {isLoading ? (
        <TransferHistorySkeleton />
      ) : transfers.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {TH_TEXT.transfer.historyEmptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.transfer.historyEmptyDescription}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {transfers.map((transfer) => {
            const isEditing = editingTransferId === transfer.id;

            return (
              <article
                key={transfer.id}
                className={[
                  "rounded-xl border p-4 transition",
                  isEditing
                    ? "border-violet-300 bg-violet-50/70 ring-2 ring-violet-200 dark:border-violet-700 dark:bg-violet-950/20 dark:ring-violet-900/70"
                    : "border-slate-200 bg-slate-50/80 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-violet-900",
                ].join(" ")}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {TH_TEXT.transfer.sourceWallet}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {transfer.sourceWalletName || TH_TEXT.common.none}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span>{TH_TEXT.transfer.transferTo}</span>
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {transfer.destinationWalletName || TH_TEXT.common.none}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {TH_TEXT.transfer.amount}
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">
                      {formatMoney(transfer.amount)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {TH_TEXT.transfer.date}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {formatDate(transfer.transfer_date)}
                    </p>
                    <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                      {transfer.note || TH_TEXT.common.none}
                    </p>
                  </div>

                  <div className="flex gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant={isEditing ? "primary" : "secondary"}
                      size="sm"
                      disabled={isSaving}
                      onClick={() => onEdit(transfer)}
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
                      aria-label={`${TH_TEXT.common.delete} ${getTransferLabel(transfer)}`}
                      onClick={() => onDelete(transfer)}
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
