"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { TH_TEXT } from "@/constants/th";
import { useWallet } from "@/feature/wallet/hooks/useWallet";
import type { AllocationFormValues, MoneyAllocation } from "../hooks/useAllocation";
import { useAllocation } from "../hooks/useAllocation";
import { formatWalletMoney, getEligibleAllocationWallets } from "../lib/allocationWallet";
import AllocationForm from "./AllocationForm";
import AllocationHistory from "./AllocationHistory";

function AllocationSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80" />
      <div className="h-72 rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80" />
    </div>
  );
}

function getInitialValues(allocation: MoneyAllocation): AllocationFormValues {
  return {
    source_wallet_id: allocation.source_wallet_id,
    amount: allocation.amount,
    allocation_date: allocation.allocation_date,
    note: allocation.note,
    destinations: allocation.destinations.map((destination) => ({
      wallet_id: destination.wallet_id,
      amount: destination.amount,
    })),
  };
}

export default function AllocationPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [editingAllocation, setEditingAllocation] = useState<MoneyAllocation | null>(null);
  const [pendingValues, setPendingValues] = useState<AllocationFormValues | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<MoneyAllocation | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const {
    wallets,
    isLoading: isWalletLoading,
    error: walletError,
    reloadWallets,
  } = useWallet();
  const {
    allocations,
    isLoading: isAllocationLoading,
    isSaving,
    error: allocationError,
    createAllocation,
    updateAllocation,
    deleteAllocation,
  } = useAllocation({ wallets, onChanged: reloadWallets });
  const eligibleWallets = useMemo(() => getEligibleAllocationWallets(wallets), [wallets]);
  const initialValues = useMemo(
    () => (editingAllocation ? getInitialValues(editingAllocation) : undefined),
    [editingAllocation]
  );

  const confirmationMessage = useMemo(() => {
    if (!pendingValues) {
      return "";
    }

    const source = wallets.find((wallet) => wallet.id === pendingValues.source_wallet_id);
    const destinations = pendingValues.destinations
      .map((destination) => {
        const wallet = wallets.find((item) => item.id === destination.wallet_id);
        return `${wallet?.name ?? TH_TEXT.allocation.destinationWallet}: ${formatWalletMoney(destination.amount)}`;
      })
      .join("\n");

    return [
      `${TH_TEXT.allocation.sourceWallet}: ${source?.name ?? TH_TEXT.common.none}`,
      `${TH_TEXT.allocation.amount}: ${formatWalletMoney(pendingValues.amount)}`,
      destinations,
    ].join("\n");
  }, [pendingValues, wallets]);

  const handleEdit = (allocation: MoneyAllocation) => {
    setEditingAllocation(allocation);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleConfirmSubmit = async () => {
    if (!pendingValues || isSaving) {
      return;
    }

    const success = editingAllocation
      ? await updateAllocation(editingAllocation.id, pendingValues)
      : await createAllocation(pendingValues);

    if (success) {
      setPendingValues(null);
      setEditingAllocation(null);
      setFormVersion((current) => current + 1);
    }
  };

  const handleDelete = async () => {
    if (!deletingAllocation || isSaving) {
      return;
    }

    const success = await deleteAllocation(deletingAllocation.id);

    if (success) {
      if (editingAllocation?.id === deletingAllocation.id) {
        setEditingAllocation(null);
        setFormVersion((current) => current + 1);
      }
      setDeletingAllocation(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.allocation.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {TH_TEXT.allocation.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.allocation.subtitle}
        </p>
      </header>

      {walletError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{walletError}</p>
          <Button variant="secondary" size="sm" disabled={isWalletLoading} onClick={reloadWallets}>
            {TH_TEXT.allocation.retry}
          </Button>
        </div>
      )}

      {isWalletLoading ? (
        <AllocationSkeleton />
      ) : eligibleWallets.length < 2 ? (
        <section className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {TH_TEXT.allocation.noWalletsTitle}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {TH_TEXT.allocation.noWalletsDescription}
            </p>
            <Link
              href="/wallet"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              {TH_TEXT.allocation.manageWallets}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div ref={formRef}>
            <AllocationForm
              key={`${editingAllocation?.id ?? "create"}-${formVersion}`}
              wallets={wallets}
              isSaving={isSaving}
              error={allocationError}
              mode={editingAllocation ? "edit" : "create"}
              initialValues={initialValues}
              editingAllocation={editingAllocation}
              onCancelEdit={() => {
                setEditingAllocation(null);
                setFormVersion((current) => current + 1);
              }}
              onSubmit={setPendingValues}
            />
          </div>

          <AllocationHistory
            allocations={allocations}
            isLoading={isAllocationLoading}
            isSaving={isSaving}
            editingAllocationId={editingAllocation?.id ?? null}
            onEdit={handleEdit}
            onDelete={setDeletingAllocation}
          />
        </>
      )}

      <ConfirmationDialog
        isOpen={!!pendingValues}
        title={editingAllocation ? TH_TEXT.allocation.confirmUpdateTitle : TH_TEXT.allocation.confirmCreateTitle}
        message={confirmationMessage}
        confirmText={editingAllocation ? TH_TEXT.allocation.saveChanges : TH_TEXT.allocation.submit}
        variant="warning"
        isLoading={isSaving}
        onConfirm={() => void handleConfirmSubmit()}
        onCancel={() => setPendingValues(null)}
      />

      <ConfirmationDialog
        isOpen={!!deletingAllocation}
        title={TH_TEXT.allocation.deleteConfirmTitle}
        message={TH_TEXT.allocation.deleteConfirmMessage.replace(
          "%s",
          deletingAllocation?.source_wallet_name ?? ""
        )}
        confirmText={TH_TEXT.common.delete}
        isLoading={isSaving}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeletingAllocation(null)}
      />
    </div>
  );
}
