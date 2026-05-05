"use client";

import { TH_TEXT } from "@/constants/th";
import TransactionList from "@/feature/transaction/components/TransactionList";
import TransactionFilter from "@/feature/transaction/components/TransactionFilter";
import TransactionModal from "@/feature/transaction/components/TransactionModal";
import { useTransactionList } from "@/feature/transaction/hooks/useTransaction";

interface TransactionsPageContentProps {
  wallets: { id: string; name: string }[];
}

export default function TransactionsPageContent({ wallets }: TransactionsPageContentProps) {
  const {
    transactions,
    categories,
    filters,
    hasMore,
    isLoading,
    modalOpen,
    editingTransaction,
    updateFilter,
    loadMore,
    openEditModal,
    closeModal,
    updateTransaction,
  } = useTransactionList();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.transaction.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {TH_TEXT.transaction.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.transaction.subtitle}
        </p>
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
      />

      <TransactionModal
        isOpen={modalOpen}
        transaction={editingTransaction}
        walletName={editingTransaction?.wallet_name}
        categories={categories}
        onClose={closeModal}
        onSave={() => {}}
        onUpdate={updateTransaction}
      />
    </div>
  );
}