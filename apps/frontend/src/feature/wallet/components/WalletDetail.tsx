"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import TransactionList from "@/feature/transaction/components/TransactionList";
import TransactionModal from "@/feature/transaction/components/TransactionModal";
import { useTransaction } from "@/feature/transaction/hooks/useTransaction";
import type { Wallet } from "../hooks/useWallet";

type TabType = "overview" | "transactions";

interface WalletDetailProps {
  wallet: Wallet | null;
  childCount: number;
  onEditWallet: (wallet: Wallet) => void;
  onDeleteWallet: (walletId: string) => void;
  onAddSubWallet: (parentId: string) => void;
  onCreateWallet: () => void;
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
  onDeleteWallet,
}: {
  wallet: Wallet;
  childCount: number;
  onAddSubWallet: (id: string) => void;
  onEditWallet: (wallet: Wallet) => void;
  onDeleteWallet: (id: string) => void;
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
          <Button variant="danger" size="sm" onClick={() => onDeleteWallet(wallet.id)}>
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
  childCount,
  onEditWallet,
  onDeleteWallet,
  onAddSubWallet,
  onCreateWallet,
}: WalletDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const { displayedTransactions, categories, modalOpen, openModal, closeModal, addTransaction, loadMore, hasMore, isLoading } = useTransaction(wallet?.id);

  const tabs = [
    { id: "overview" as TabType, label: TH_TEXT.transaction.overview },
    { id: "transactions" as TabType, label: TH_TEXT.transaction.transactions },
  ];

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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "transactions" && (
            <Button onClick={() => openModal(wallet.id)}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
              </svg>
              {TH_TEXT.transaction.addTransaction}
            </Button>
          )}
        </div>

        {activeTab === "overview" && (
          <OverviewTab
            wallet={wallet}
            childCount={childCount}
            onAddSubWallet={onAddSubWallet}
            onEditWallet={onEditWallet}
            onDeleteWallet={onDeleteWallet}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionList
            transactions={displayedTransactions}
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
            empty={displayedTransactions.length === 0}
          />
        )}
      </section>

      <TransactionModal
        isOpen={modalOpen}
        walletId={wallet.id}
        walletName={wallet.name}
        categories={categories}
        onClose={closeModal}
        onSave={addTransaction}
      />
    </>
  );
}