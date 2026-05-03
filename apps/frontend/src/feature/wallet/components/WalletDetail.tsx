"use client";

import type { Wallet } from "../hooks/useWallet";

interface WalletDetailProps {
  wallet: Wallet | null;
  childCount: number;
  onEditWallet: (wallet: Wallet) => void;
  onDeleteWallet: (walletId: string) => void;
  onAddSubWallet: (parentId: string) => void;
  onCreateWallet: () => void;
}

function formatMoney(balance: string, currency: string) {
  return new Intl.NumberFormat("en-US", {
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
      {type}
    </span>
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
  if (!wallet) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">No wallet selected</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            Create your first wallet to start organizing your personal finance structure.
          </p>
          <button
            type="button"
            onClick={onCreateWallet}
            className="mt-6 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700"
          >
            New Wallet
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[520px] rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
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
                {wallet.description || "No description"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAddSubWallet(wallet.id)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Add Sub-wallet
          </button>
          <button
            type="button"
            onClick={() => onEditWallet(wallet)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeleteWallet(wallet.id)}
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Balance</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {formatMoney(wallet.balance, wallet.currency)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Type</p>
          <div className="mt-3">
            <TypeBadge type={wallet.wallet_type} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sub-wallets</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {childCount}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/20">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Currency</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">{wallet.currency}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Status</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {wallet.is_active ? "Active" : "Inactive"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Created</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {new Date(wallet.created_at).toLocaleDateString("en-US")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Updated</dt>
            <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {new Date(wallet.updated_at).toLocaleDateString("en-US")}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
