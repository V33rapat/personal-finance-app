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
    selectWallet,
    toggleExpanded,
    openCreateWallet,
    openEditWallet,
    closeModal,
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

        <Button onClick={() => openCreateWallet()}>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
          {TH_TEXT.wallet.newWallet}
        </Button>
      </header>

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
          childCount={childCount}
          onEditWallet={openEditWallet}
          onDeleteWallet={deleteWallet}
          onAddSubWallet={(parentId) => openCreateWallet(parentId)}
          onCreateWallet={() => openCreateWallet()}
        />
      </div>

      {modal.isOpen && (
        <WalletFormModal
          key={`${modal.mode}-${modal.wallet?.id ?? "new"}-${modal.parentId ?? "root"}`}
          isOpen={modal.isOpen}
          mode={modal.mode}
          wallet={modal.wallet}
          wallets={wallets}
          parentId={modal.parentId}
          onClose={closeModal}
          onSave={saveWallet}
        />
      )}
    </div>
  );
}
