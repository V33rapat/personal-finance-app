"use client";

import { useMemo, useState } from "react";
import { Search, Settings2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import {
  getUnavailableWallets,
  getWalletSummaryLabel,
  toggleDashboardWalletSelection,
  type DashboardWalletSummaryResponse,
} from "../lib/walletSummary";

interface DashboardWalletSummarySettingsProps {
  summary: DashboardWalletSummaryResponse;
  isSaving: boolean;
  error: string | null;
  onSave: (walletIds: string[]) => Promise<boolean>;
}

export default function DashboardWalletSummarySettings({
  summary,
  isSaving,
  error,
  onSave,
}: DashboardWalletSummarySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftWalletIds, setDraftWalletIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const unavailableWallets = useMemo(
    () =>
      getUnavailableWallets(summary.selected_wallets).filter((wallet) =>
        draftWalletIds.includes(wallet.id),
      ),
    [draftWalletIds, summary.selected_wallets],
  );
  const eligibleWallets = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("th");

    if (!normalizedSearch) {
      return summary.eligible_wallets;
    }

    return summary.eligible_wallets.filter((wallet) =>
      getWalletSummaryLabel(wallet).toLocaleLowerCase("th").includes(normalizedSearch),
    );
  }, [search, summary.eligible_wallets]);

  const openSettings = () => {
    setDraftWalletIds(
      summary.is_configured
        ? summary.selected_wallets.map((wallet) => wallet.id)
        : summary.displayed_wallets.map((wallet) => wallet.id),
    );
    setSearch("");
    setSelectionError(null);
    setIsOpen(true);
  };

  const closeSettings = () => {
    if (!isSaving) {
      setIsOpen(false);
    }
  };

  const toggleWallet = (walletId: string) => {
    const nextWalletIds = toggleDashboardWalletSelection(
      draftWalletIds,
      walletId,
    );

    if (!nextWalletIds) {
      setSelectionError(TH_TEXT.dashboard.walletSummaryMaxReached);
      return;
    }

    setSelectionError(null);
    setDraftWalletIds(nextWalletIds);
  };

  const removeUnavailableWallet = (walletId: string) => {
    setSelectionError(null);
    setDraftWalletIds((current) => current.filter((id) => id !== walletId));
  };

  const save = async () => {
    const saved = await onSave(draftWalletIds);

    if (saved) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openSettings}
        aria-label={TH_TEXT.dashboard.configureWalletSummary}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-violet-300"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={TH_TEXT.dashboard.configureWalletSummary}
          className="absolute right-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {TH_TEXT.dashboard.configureWalletSummary}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {TH_TEXT.dashboard.walletSummarySelectionCount.replace(
                  "%s",
                  String(draftWalletIds.length),
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={closeSettings}
              disabled={isSaving}
              aria-label={TH_TEXT.common.close}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {!summary.is_configured && (
            <p className="mt-3 border-l-2 border-violet-400 pl-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {TH_TEXT.dashboard.walletSummaryDefaultHint}
            </p>
          )}

          <label className="relative mt-4 block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={TH_TEXT.dashboard.walletSummarySearch}
              disabled={isSaving}
              className="h-10 w-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
            />
          </label>

          {summary.eligible_wallets.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.dashboard.walletSummaryNoEligibleWallets}
            </p>
          ) : eligibleWallets.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.dashboard.walletSummaryNoSearchResult}
            </p>
          ) : (
            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
              {eligibleWallets.map((wallet) => {
                const isChecked = draftWalletIds.includes(wallet.id);

                return (
                  <label
                    key={wallet.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0 truncate">
                      {getWalletSummaryLabel(wallet)}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleWallet(wallet.id)}
                      disabled={isSaving}
                      aria-label={getWalletSummaryLabel(wallet)}
                      className="h-4 w-4 shrink-0 accent-violet-600"
                    />
                  </label>
                );
              })}
            </div>
          )}

          {unavailableWallets.length > 0 && (
            <section className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {TH_TEXT.dashboard.walletSummaryUnavailable}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {TH_TEXT.dashboard.walletSummaryUnavailableHint}
              </p>
              <ul className="mt-2 space-y-1">
                {unavailableWallets.map((wallet) => (
                  <li
                    key={wallet.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400"
                  >
                    <span className="min-w-0 truncate">
                      {getWalletSummaryLabel(wallet)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeUnavailableWallet(wallet.id)}
                      disabled={isSaving}
                      aria-label={`${TH_TEXT.dashboard.walletSummaryRemoveWallet} ${getWalletSummaryLabel(wallet)}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(selectionError || error) && (
            <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">
              {selectionError ?? error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={closeSettings} disabled={isSaving}>
              {TH_TEXT.dashboard.walletSummaryCancel}
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={isSaving}>
              {TH_TEXT.dashboard.walletSummarySave}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
