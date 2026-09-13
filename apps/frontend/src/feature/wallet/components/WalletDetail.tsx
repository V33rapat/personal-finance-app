"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { TH_TEXT } from "@/constants/th";
import TransactionList from "@/feature/transaction/components/TransactionList";
import TransactionModal from "@/feature/transaction/components/TransactionModal";
import WalletTransactionFilter from "./WalletTransactionFilter";
import WalletDailyNavigator from "./WalletDailyNavigator";
import WalletDailySummary from "./WalletDailySummary";
import { useTransaction } from "@/feature/transaction/hooks/useTransaction";
import { useTransactionSelection } from "@/feature/transaction/hooks/useTransactionSelection";
import { useTransactionTemplate } from "@/feature/transaction/hooks/useTransactionTemplate";
import { toTemplateValuesFromTransaction } from "@/feature/transaction/lib/transactionTemplate";
import type { Wallet } from "../hooks/useWallet";
import { useWalletDailyTransactions } from "../hooks/useWalletDailyTransactions";
import { getBangkokToday, isCalendarDate } from "../lib/dailyTransactionDate";

type TabType = "overview" | "transactions";

interface WalletDetailProps {
  wallet: Wallet | null;
  wallets: Wallet[];
  childCount: number;
  onEditWallet: (wallet: Wallet) => void;
  onDeleteWallet: (walletId: string) => void | Promise<unknown>;
  onAddSubWallet: (parentId: string) => void;
  onCreateWallet: () => void;
  onTransactionsChanged?: () => void | Promise<void>;
}

function formatMoney(balance: string, currency: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(balance));
}

function TypeBadge({ type }: { type: Wallet["wallet_type"] }) {
  const isInvestment = type === "investment";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        isInvestment
          ? "bg-pink-50 text-pink-700 ring-1 ring-pink-100 dark:bg-pink-950/40 dark:text-pink-200 dark:ring-pink-900/60"
          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
      ].join(" ")}
    >
      {type === "investment" ? TH_TEXT.wallet.investment : TH_TEXT.wallet.normal}
    </span>
  );
}

function OverviewTab({
  wallet,
  childCount,
  onAddSubWallet,
  onEditWallet,
  onShowDeleteConfirm,
}: {
  wallet: Wallet;
  childCount: number;
  onAddSubWallet: (id: string) => void;
  onEditWallet: (wallet: Wallet) => void;
  onShowDeleteConfirm: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
              style={{ color: wallet.color ?? undefined }}
              aria-hidden
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {wallet.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {wallet.description || TH_TEXT.wallet.noDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onAddSubWallet(wallet.id)}>
            {TH_TEXT.wallet.addSubWallet}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onEditWallet(wallet)}>
            {TH_TEXT.common.edit}
          </Button>
          <Button variant="danger" size="sm" onClick={onShowDeleteConfirm}>
            {TH_TEXT.common.delete}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.wallet.balance}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {formatMoney(wallet.balance, wallet.currency)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.wallet.type}</p>
          <div className="mt-3">
            <TypeBadge type={wallet.wallet_type} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.wallet.subWallets}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {childCount}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/20">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.wallet.currency}</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">{wallet.currency}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.common.status}</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {wallet.is_active ? TH_TEXT.common.active : TH_TEXT.common.inactive}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.common.created}</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {new Date(wallet.created_at).toLocaleDateString("th-TH")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">{TH_TEXT.common.updated}</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {new Date(wallet.updated_at).toLocaleDateString("th-TH")}
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
}

export default function WalletDetail({
  wallet,
  wallets,
  childCount,
  onEditWallet,
  onDeleteWallet,
  onAddSubWallet,
  onCreateWallet,
  onTransactionsChanged,
}: WalletDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const today = useMemo(() => getBangkokToday(), []);
  const requestedDate = searchParams.get("date");
  const selectedDate =
    requestedDate && isCalendarDate(requestedDate) && requestedDate <= today
      ? requestedDate
      : today;
  const hasActiveSubWallet = useMemo(
    () =>
      !!wallet &&
      wallets.some(
        (candidate) =>
          candidate.parent_wallet_id === wallet.id &&
          candidate.is_active &&
          !candidate.deleted_at
      ),
    [wallet, wallets]
  );

  const {
    modalOpen,
    modalMode,
    editingTransaction,
    currentWalletId,
    defaultTransactionDate,
    openModal,
    openEditModal,
    openDuplicateModal,
    closeModal,
    addTransaction,
    updateTransaction,
    deleteTransactions,
    isSaving,
    error,
  } = useTransaction({ walletId: wallet?.id, autoLoad: false });
  const dailyTransactions = useWalletDailyTransactions(wallet?.id ?? null, selectedDate);
  const { selectedIds, selectedCount, toggleSelection, clearSelection, selectAll } = useTransactionSelection();
  const {
    createTemplate,
    isSaving: isSavingTemplate,
  } = useTransactionTemplate({ autoLoad: false });

  useEffect(() => {
    clearSelection();
  }, [clearSelection, dailyTransactions.filters, selectedDate, wallet?.id]);

  const updateSelectedDate = useCallback(
    (nextDate: string) => {
      if (!isCalendarDate(nextDate) || nextDate > today) return;

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set("date", nextDate);
      router.push(`/wallet?${nextSearchParams.toString()}`, { scroll: false });
    },
    [router, searchParams, today]
  );

  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);

      if (tab !== "transactions" || requestedDate === selectedDate) return;

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set("date", selectedDate);
      router.replace(`/wallet?${nextSearchParams.toString()}`, { scroll: false });
    },
    [requestedDate, router, searchParams, selectedDate]
  );

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const handleTransactionSaved = async (...args: Parameters<typeof addTransaction>) => {
    const success = await addTransaction(...args);
    if (success) {
      dailyTransactions.reload();
      await onTransactionsChanged?.();
    }
  };

  const handleTransactionUpdated = async (...args: Parameters<typeof updateTransaction>) => {
    const success = await updateTransaction(...args);
    if (success) {
      dailyTransactions.reload();
      await onTransactionsChanged?.();
    }
  };

  const confirmDeleteSelected = async () => {
    const success = await deleteTransactions(Array.from(selectedIds));
    if (!success) return;

    await onTransactionsChanged?.();
    dailyTransactions.reload();
    clearSelection();
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (wallet) {
      await onDeleteWallet(wallet.id);
    }
    setShowDeleteConfirm(false);
  };

  const tabs = [
    { id: "overview" as TabType, label: TH_TEXT.transaction.overview },
    ...(!hasActiveSubWallet
      ? [{ id: "transactions" as TabType, label: TH_TEXT.transaction.transactions }]
      : []),
  ];
  const visibleTab = hasActiveSubWallet ? "overview" : activeTab;

  if (!wallet) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{TH_TEXT.wallet.noWalletSelectedTitle}</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.wallet.noWalletSelectedDescription}
          </p>
          <Button className="mt-6" onClick={onCreateWallet}>{TH_TEXT.wallet.newWallet}</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="min-h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={[
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  visibleTab === tab.id
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {visibleTab === "overview" && (
          <OverviewTab
            wallet={wallet}
            childCount={childCount}
            onAddSubWallet={onAddSubWallet}
            onEditWallet={onEditWallet}
            onShowDeleteConfirm={handleDeleteClick}
          />
        )}

        {visibleTab === "transactions" && !hasActiveSubWallet && (
          <>
            <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <WalletDailyNavigator
                  date={selectedDate}
                  disabled={dailyTransactions.isLoading}
                  onChange={updateSelectedDate}
                />
                <Button className="w-full sm:w-auto" onClick={() => openModal(wallet.id, selectedDate)}>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
                  </svg>
                  {TH_TEXT.transaction.addTransaction}
                </Button>
              </div>
              <WalletDailySummary summary={dailyTransactions.summary} />
            </div>
            <WalletTransactionFilter
              categories={dailyTransactions.categories}
              selectedType={dailyTransactions.filters.type}
              selectedCategoryId={dailyTransactions.filters.categoryId}
              searchQuery={dailyTransactions.filters.searchQuery}
              onTypeChange={(value) => dailyTransactions.updateFilter("type", value)}
              onCategoryChange={(value) => dailyTransactions.updateFilter("categoryId", value)}
              onSearchChange={(value) => dailyTransactions.updateFilter("searchQuery", value)}
            />
            {dailyTransactions.error && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
                <span>{dailyTransactions.error}</span>
                <Button size="sm" variant="secondary" onClick={dailyTransactions.reload}>
                  {TH_TEXT.common.retry}
                </Button>
              </div>
            )}
            {dailyTransactions.isLoading && dailyTransactions.items.length === 0 ? (
              <div className="space-y-3 py-2" aria-label={TH_TEXT.common.loading}>
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : (
              <TransactionList
                transactions={dailyTransactions.items}
                hasMore={dailyTransactions.hasMore}
                isLoading={dailyTransactions.isLoadingMore}
                onLoadMore={dailyTransactions.loadMore}
                empty={dailyTransactions.items.length === 0}
                onEdit={openEditModal}
                onDuplicate={openDuplicateModal}
                onSaveAsTemplate={(transaction) =>
                  createTemplate(toTemplateValuesFromTransaction(transaction))
                }
                isSavingTemplate={isSavingTemplate}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelection}
                onDeleteSelected={handleDeleteSelected}
                onClearSelection={clearSelection}
                onSelectAll={() =>
                  selectAll(
                    dailyTransactions.items
                      .filter((transaction) => transaction.management === "manual")
                      .map((transaction) => transaction.id)
                  )
                }
              />
            )}
          </>
        )}
      </section>

      <TransactionModal
        isOpen={modalOpen}
        mode={modalMode}
        transaction={editingTransaction}
        wallets={wallets}
        defaultWalletId={currentWalletId}
        defaultTransactionDate={defaultTransactionDate}
        isSaving={isSaving}
        error={error}
        onClose={closeModal}
        onSave={handleTransactionSaved}
        onUpdate={handleTransactionUpdated}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title={TH_TEXT.wallet.deleteConfirmTitle}
        message={selectedCount > 0 
          ? `คุณต้องการลบ ${selectedCount} รายการ หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
          : `คุณต้องการลบ "${wallet.name}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
        }
        onConfirm={selectedCount > 0 ? confirmDeleteSelected : handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
