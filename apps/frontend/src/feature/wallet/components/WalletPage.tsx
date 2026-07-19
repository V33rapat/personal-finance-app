"use client";

import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import { useWallet } from "../hooks/useWallet";
import WalletDetail from "./WalletDetail";
import WalletFormModal from "./WalletFormModal";
import WalletSidebar from "./WalletSidebar";

export default function WalletPage() {
  const {
    wallets,
    walletTree,
    selectedWallet,
    selectedWalletId,
    expandedIds,
    modal,
    childCount,
    isLoading,
    isSaving,
    error,
    selectWallet,
    toggleExpanded,
    openCreateWallet,
    openEditWallet,
    closeModal,
    reloadWallets,
    saveWallet,
    deleteWallet,
  } = useWallet();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {TH_TEXT.wallet.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {TH_TEXT.wallet.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.wallet.subtitle}
          </p>
        </div>

        <Button onClick={() => openCreateWallet()} disabled={isLoading || isSaving}>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
          {TH_TEXT.wallet.newWallet}
        </Button>
      </header>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={reloadWallets} disabled={isLoading}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="min-h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          </div>
          <div className="min-h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <WalletSidebar
            walletTree={walletTree}
            expandedIds={expandedIds}
            selectedWalletId={selectedWalletId}
            onSelectWallet={selectWallet}
            onToggleWallet={toggleExpanded}
            onCreateWallet={() => openCreateWallet()}
            onAddSubWallet={(parentId) => openCreateWallet(parentId)}
          />

          <WalletDetail
            wallet={selectedWallet}
            wallets={wallets}
            childCount={childCount}
            onEditWallet={openEditWallet}
            onDeleteWallet={deleteWallet}
            onAddSubWallet={(parentId) => openCreateWallet(parentId)}
            onCreateWallet={() => openCreateWallet()}
            onTransactionsChanged={reloadWallets}
          />
        </div>
      )}

      {modal.isOpen && (
        <WalletFormModal
          key={`${modal.mode}-${modal.wallet?.id ?? "new"}-${modal.parentId ?? "root"}`}
          isOpen={modal.isOpen}
          mode={modal.mode}
          wallet={modal.wallet}
          wallets={wallets}
          parentId={modal.parentId}
          isSaving={isSaving}
          error={error}
          onClose={closeModal}
          onSave={saveWallet}
        />
      )}
    </div>
  );
}
