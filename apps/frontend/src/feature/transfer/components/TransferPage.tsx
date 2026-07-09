"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { TH_TEXT } from "@/constants/th";
import { useWallet } from "@/feature/wallet/hooks/useWallet";
import {
  type Transfer,
  type TransferFormValues,
  useTransfer,
} from "../hooks/useTransfer";
import TransferForm from "./TransferForm";
import TransferHistory from "./TransferHistory";

function TransferSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-8 grid gap-4">
          <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="h-72 rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

function WalletRequirementEmptyState() {
  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">
          {TH_TEXT.transfer.noWalletsTitle}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.transfer.noWalletsDescription}
        </p>
        <Link
          href="/wallet"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          {TH_TEXT.transfer.manageWallets}
        </Link>
      </div>
    </section>
  );
}

function WalletSummaryPanel({
  walletCount,
  totalBalance,
}: {
  walletCount: number;
  totalBalance: number;
}) {
  const formattedTotal = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(totalBalance);

  return (
    <aside className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
        {TH_TEXT.transfer.walletSummary}
      </p>
      <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
        {TH_TEXT.wallet.walletTree}
      </h2>
      <div className="mt-5 grid gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {TH_TEXT.dashboard.activeWallets}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {walletCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {TH_TEXT.dashboard.totalBalance}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {formattedTotal}
          </p>
        </div>
      </div>
    </aside>
  );
}

function getTransferLabel(transfer: Transfer) {
  const source = transfer.sourceWalletName || TH_TEXT.transfer.sourceWallet;
  const destination =
    transfer.destinationWalletName || TH_TEXT.transfer.destinationWallet;

  return `${source} -> ${destination}`;
}

export default function TransferPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<Transfer | null>(null);
  const {
    wallets,
    isLoading: isWalletLoading,
    error: walletError,
    reloadWallets,
  } = useWallet();
  const {
    transfers,
    createTransfer,
    updateTransfer,
    deleteTransfer,
    isLoading: isTransferLoading,
    isSaving,
    error: transferError,
  } = useTransfer({
    wallets,
    autoLoad: true,
    onChanged: reloadWallets,
  });
  const editingInitialValues = useMemo<TransferFormValues | undefined>(() => {
    if (!editingTransfer) return undefined;

    return {
      from_wallet_id: editingTransfer.from_wallet_id,
      to_wallet_id: editingTransfer.to_wallet_id,
      amount: editingTransfer.amount,
      transfer_date: editingTransfer.transfer_date,
      note: editingTransfer.note,
    };
  }, [editingTransfer]);

  const totalBalance = wallets.reduce(
    (sum, wallet) =>
      wallet.parent_wallet_id ? sum : sum + Number(wallet.balance || 0),
    0
  );

  const handleEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmitTransfer = async (values: TransferFormValues) => {
    if (!editingTransfer) {
      return createTransfer(values);
    }

    const success = await updateTransfer(editingTransfer.id, values);

    if (success) {
      setEditingTransfer(null);
    }

    return success;
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransfer) return;

    const success = await deleteTransfer(deletingTransfer.id);

    if (success) {
      if (editingTransfer?.id === deletingTransfer.id) {
        setEditingTransfer(null);
      }

      setDeletingTransfer(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {TH_TEXT.transfer.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {TH_TEXT.transfer.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.transfer.subtitle}
          </p>
        </div>
      </header>

      {walletError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{walletError}</p>
          <Button variant="secondary" size="sm" onClick={reloadWallets} disabled={isWalletLoading}>
            Retry
          </Button>
        </div>
      )}

      {isWalletLoading ? (
        <TransferSkeleton />
      ) : wallets.length < 2 ? (
        <WalletRequirementEmptyState />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div ref={formRef}>
              <TransferForm
                key={editingTransfer?.id ?? "create"}
                wallets={wallets}
                isSaving={isSaving}
                error={transferError}
                mode={editingTransfer ? "edit" : "create"}
                initialValues={editingInitialValues}
                editingTransfer={editingTransfer}
                onCancelEdit={() => setEditingTransfer(null)}
                onSubmit={handleSubmitTransfer}
              />
            </div>
            <WalletSummaryPanel
              walletCount={wallets.length}
              totalBalance={totalBalance}
            />
          </div>

          <TransferHistory
            transfers={transfers}
            isLoading={isTransferLoading}
            isSaving={isSaving}
            editingTransferId={editingTransfer?.id ?? null}
            onEdit={handleEditTransfer}
            onDelete={setDeletingTransfer}
          />

          <ConfirmationDialog
            isOpen={!!deletingTransfer}
            title={TH_TEXT.transfer.deleteConfirmTitle}
            message={TH_TEXT.transfer.deleteConfirmMessage.replace(
              "%s",
              deletingTransfer ? getTransferLabel(deletingTransfer) : ""
            )}
            confirmText={TH_TEXT.common.delete}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeletingTransfer(null)}
          />
        </>
      )}
    </div>
  );
}
