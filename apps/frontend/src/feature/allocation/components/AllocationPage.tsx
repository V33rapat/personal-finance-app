"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { TH_TEXT } from "@/constants/th";
import { useWallet } from "@/feature/wallet/hooks/useWallet";
import type { AllocationFormValues, MoneyAllocation } from "../hooks/useAllocation";
import { useAllocation } from "../hooks/useAllocation";
import { formatWalletMoney, getEligibleAllocationWallets } from "../lib/allocationWallet";
import { getAllocationDuplicateValues, getAllocationFormValues } from "../lib/allocationFormValues";
import AllocationForm from "./AllocationForm";
import AllocationEditorModal from "./AllocationEditorModal";
import AllocationHistory from "./AllocationHistory";

function AllocationSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80" />
      <div className="h-72 rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80" />
    </div>
  );
}

export default function AllocationPage() {
  const [activeEditor, setActiveEditor] = useState<{
    mode: "edit" | "duplicate";
    allocation: MoneyAllocation;
  } | null>(null);
  const [pendingValues, setPendingValues] = useState<AllocationFormValues | null>(null);
  const [pendingOperation, setPendingOperation] = useState<{
    type: "create" | "update" | "duplicate";
    allocationId?: string;
  } | null>(null);
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
    () => {
      if (!activeEditor) return undefined;

      return activeEditor.mode === "edit"
        ? getAllocationFormValues(activeEditor.allocation)
        : getAllocationDuplicateValues(activeEditor.allocation);
    },
    [activeEditor]
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

  const handleEdit = (allocation: MoneyAllocation) => setActiveEditor({ mode: "edit", allocation });

  const handleDuplicate = (allocation: MoneyAllocation) =>
    setActiveEditor({ mode: "duplicate", allocation });

  const handleCreateSubmit = (values: AllocationFormValues) => {
    setPendingOperation({ type: "create" });
    setPendingValues(values);
  };

  const handleEditorSubmit = (values: AllocationFormValues) => {
    if (!activeEditor) return;

    setPendingOperation(
      activeEditor.mode === "edit"
        ? { type: "update", allocationId: activeEditor.allocation.id }
        : { type: "duplicate" },
    );
    setPendingValues(values);
  };

  const handleCloseEditor = () => {
    if (isSaving) return;

    setActiveEditor(null);
    setPendingValues(null);
    setPendingOperation(null);
  };

  const handleCancelConfirmation = () => {
    setPendingValues(null);
    setPendingOperation(null);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingValues || !pendingOperation || isSaving) {
      return;
    }

    const success = pendingOperation.type === "update" && pendingOperation.allocationId
      ? await updateAllocation(pendingOperation.allocationId, pendingValues)
      : await createAllocation(
          pendingValues,
          pendingOperation.type === "duplicate" ? TH_TEXT.allocation.duplicateSuccess : undefined,
        );

    setPendingValues(null);
    setPendingOperation(null);

    if (success) {
      setActiveEditor(null);
      setFormVersion((current) => current + 1);
    }
  };

  const handleDelete = async () => {
    if (!deletingAllocation || isSaving) {
      return;
    }

    const success = await deleteAllocation(deletingAllocation.id);

    if (success) {
      if (activeEditor?.allocation.id === deletingAllocation.id) {
        setActiveEditor(null);
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
          <AllocationForm
            key={`create-${formVersion}`}
            wallets={wallets}
            isSaving={isSaving}
            error={allocationError}
            mode="create"
            onSubmit={handleCreateSubmit}
          />

          <AllocationHistory
            allocations={allocations}
            isLoading={isAllocationLoading}
            isSaving={isSaving}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={setDeletingAllocation}
          />
        </>
      )}

      {activeEditor && initialValues && (
        <AllocationEditorModal
          allocation={activeEditor.allocation}
          mode={activeEditor.mode}
          initialValues={initialValues}
          wallets={wallets}
          isSaving={isSaving}
          error={allocationError}
          onClose={handleCloseEditor}
          onSubmit={handleEditorSubmit}
        />
      )}

      <ConfirmationDialog
        isOpen={!!pendingValues}
        title={
          pendingOperation?.type === "update"
            ? TH_TEXT.allocation.confirmUpdateTitle
            : pendingOperation?.type === "duplicate"
              ? TH_TEXT.allocation.confirmDuplicateTitle
              : TH_TEXT.allocation.confirmCreateTitle
        }
        message={confirmationMessage}
        confirmText={
          pendingOperation?.type === "update"
            ? TH_TEXT.allocation.saveChanges
            : pendingOperation?.type === "duplicate"
              ? TH_TEXT.allocation.duplicateSubmit
              : TH_TEXT.allocation.submit
        }
        variant="warning"
        isLoading={isSaving}
        onConfirm={() => void handleConfirmSubmit()}
        onCancel={handleCancelConfirmation}
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
