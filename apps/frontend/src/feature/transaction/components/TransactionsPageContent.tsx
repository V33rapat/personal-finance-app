"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import TransactionList from "@/feature/transaction/components/TransactionList";
import TransactionFilter from "@/feature/transaction/components/TransactionFilter";
import TransactionModal from "@/feature/transaction/components/TransactionModal";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { useTransaction } from "@/feature/transaction/hooks/useTransaction";
import { useTransactionSelection } from "@/feature/transaction/hooks/useTransactionSelection";
import { useTransactionTemplate } from "@/feature/transaction/hooks/useTransactionTemplate";
import { toTemplateValuesFromTransaction } from "@/feature/transaction/lib/transactionTemplate";
import { getTransactionWalletOptions } from "@/feature/transaction/lib/transactionWallet";
import { useWallet } from "@/feature/wallet/hooks/useWallet";

export default function TransactionsPageContent() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    wallets,
    isLoading: isWalletLoading,
  } = useWallet();

  const {
    transactions,
    categories,
    filters,
    hasMore,
    isLoading,
    isSaving,
    error,
    modalOpen,
    editingTransaction,
    currentWalletId,
    updateFilter,
    loadMore,
    openModal,
    openEditModal,
    closeModal,
    addTransaction,
    updateTransaction,
    deleteTransactions,
  } = useTransaction();
  const {
    createTemplate,
    isSaving: isSavingTemplate,
  } = useTransactionTemplate({ autoLoad: false });

  const { selectedIds, selectedCount, toggleSelection, clearSelection, selectAll } = useTransactionSelection();

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const transactionWalletOptions = getTransactionWalletOptions(wallets);
  const defaultWalletId = transactionWalletOptions.some(
    (wallet) => wallet.id === filters.walletId
  )
    ? filters.walletId
    : undefined;

  const handleCreateTransaction = () => {
    if (transactionWalletOptions.length === 0) return;
    openModal(defaultWalletId);
  };

  const confirmDeleteSelected = async () => {
    const success = await deleteTransactions(Array.from(selectedIds));
    if (!success) return;

    clearSelection();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {TH_TEXT.transaction.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {TH_TEXT.transaction.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.transaction.subtitle}
          </p>
        </div>

        <Button
          onClick={handleCreateTransaction}
          disabled={transactionWalletOptions.length === 0 || isSaving || isWalletLoading}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
          {TH_TEXT.transaction.addTransaction}
        </Button>
      </header>

      <TransactionFilter
        wallets={wallets}
        categories={categories}
        selectedWalletId={filters.walletId}
        selectedType={filters.type}
        selectedCategoryId={filters.categoryId}
        startDate={filters.startDate}
        endDate={filters.endDate}
        searchQuery={filters.searchQuery}
        onWalletChange={(value) => updateFilter("walletId", value)}
        onTypeChange={(value) => updateFilter("type", value)}
        onCategoryChange={(value) => updateFilter("categoryId", value)}
        onStartDateChange={(value) => updateFilter("startDate", value)}
        onEndDateChange={(value) => updateFilter("endDate", value)}
        onSearchChange={(value) => updateFilter("searchQuery", value)}
      />

      <TransactionList
        transactions={transactions}
        showWallet={true}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        empty={transactions.length === 0}
        onEdit={openEditModal}
        onSaveAsTemplate={(transaction) =>
          createTemplate(toTemplateValuesFromTransaction(transaction))
        }
        isSavingTemplate={isSavingTemplate}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelection}
        onDeleteSelected={handleDeleteSelected}
        onClearSelection={clearSelection}
        onSelectAll={() => selectAll(transactions.map(t => t.id))}
      />

      <TransactionModal
        isOpen={modalOpen}
        transaction={editingTransaction}
        wallets={wallets}
        defaultWalletId={currentWalletId}
        isSaving={isSaving}
        error={error}
        onClose={closeModal}
        onSave={addTransaction}
        onUpdate={updateTransaction}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title={TH_TEXT.wallet.deleteConfirmTitle}
        message={`คุณต้องการลบ ${selectedCount} รายการ หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={confirmDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
