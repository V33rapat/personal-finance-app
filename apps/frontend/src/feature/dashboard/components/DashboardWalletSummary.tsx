"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import { useDashboardWalletSummary } from "../hooks/useDashboardWalletSummary";
import DashboardWalletSummarySettings from "./DashboardWalletSummarySettings";
import WalletBalanceCard from "./WalletBalanceCard";

function WalletCardSkeleton() {
  return (
    <div className="min-h-[146px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 p-5 dark:border-slate-800 dark:bg-slate-800/70">
      <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="mt-6 h-7 w-36 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default function DashboardWalletSummary() {
  const { summary, isLoading, isSaving, error, load, saveWallets } =
    useDashboardWalletSummary();

  return (
    <section aria-labelledby="dashboard-wallet-summary-heading">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="dashboard-wallet-summary-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-50"
          >
            {TH_TEXT.dashboard.walletSummary}
          </h2>
          {!summary?.is_configured && summary && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.dashboard.walletSummaryDefaultHint}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/wallet"
            className="px-2 py-2 text-sm font-semibold text-violet-600 transition hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {TH_TEXT.dashboard.viewAllWallets}
          </Link>
          {summary && (
            <DashboardWalletSummarySettings
              summary={summary}
              isSaving={isSaving}
              error={error}
              onSave={saveWallets}
            />
          )}
        </div>
      </header>

      {error && !summary && (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={isLoading}>
            {TH_TEXT.dashboard.retry}
          </Button>
        </div>
      )}

      {isLoading && !summary ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <WalletCardSkeleton key={index} />
          ))}
        </div>
      ) : summary?.displayed_wallets.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2" aria-busy={isSaving}>
          {summary.displayed_wallets.map((wallet) => (
            <WalletBalanceCard key={wallet.id} wallet={wallet} />
          ))}
        </div>
      ) : summary ? (
        <div className="mt-4 border border-dashed border-slate-300 px-5 py-9 text-center dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {summary.is_configured
              ? TH_TEXT.dashboard.walletSummaryEmptyTitle
              : TH_TEXT.dashboard.walletSummaryNoEligibleWallets}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {summary.is_configured
              ? TH_TEXT.dashboard.walletSummaryEmptyDescription
              : TH_TEXT.dashboard.walletSummaryNoEligibleWallets}
          </p>
        </div>
      ) : null}
    </section>
  );
}
