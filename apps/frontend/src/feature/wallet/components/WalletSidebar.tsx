"use client";

import type { WalletNode } from "../hooks/useWallet";
import WalletTreeItem from "./WalletTreeItem";

interface WalletSidebarProps {
  walletTree: WalletNode[];
  expandedIds: Set<string>;
  selectedWalletId: string | null;
  onSelectWallet: (walletId: string) => void;
  onToggleWallet: (walletId: string) => void;
  onCreateWallet: () => void;
  onAddSubWallet: (parentId: string) => void;
}

export default function WalletSidebar({
  walletTree,
  expandedIds,
  selectedWalletId,
  onSelectWallet,
  onToggleWallet,
  onCreateWallet,
  onAddSubWallet,
}: WalletSidebarProps) {
  return (
    <aside className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Wallet Tree</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Organize money by purpose
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateWallet}
          aria-label="Create wallet"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
      </div>

      {walletTree.length > 0 ? (
        <ul className="space-y-1">
          {walletTree.map((wallet) => (
            <WalletTreeItem
              key={wallet.id}
              wallet={wallet}
              expandedIds={expandedIds}
              selectedWalletId={selectedWalletId}
              onSelect={onSelectWallet}
              onToggle={onToggleWallet}
              onAddSubWallet={onAddSubWallet}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">No wallets yet</h3>
          <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500 dark:text-slate-400">
            Create a wallet to start grouping your cash, savings, or investments.
          </p>
          <button
            type="button"
            onClick={onCreateWallet}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700"
          >
            New Wallet
          </button>
        </div>
      )}
    </aside>
  );
}
