"use client";

import type { WalletNode } from "../hooks/useWallet";

interface WalletTreeItemProps {
  wallet: WalletNode;
  depth?: number;
  expandedIds: Set<string>;
  selectedWalletId: string | null;
  onSelect: (walletId: string) => void;
  onToggle: (walletId: string) => void;
  onAddSubWallet: (parentId: string) => void;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={[
        "h-3.5 w-3.5 transition-transform duration-200",
        isOpen ? "rotate-90" : "",
      ].join(" ")}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7.3 4.3a1 1 0 0 0 0 1.4L11.6 10l-4.3 4.3a1 1 0 1 0 1.4 1.4l5-5a1 1 0 0 0 0-1.4l-5-5a1 1 0 0 0-1.4 0Z" />
    </svg>
  );
}

function WalletGlyph({ color }: { color: string | null }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/70 bg-slate-100 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
      style={{ color: color ?? undefined }}
      aria-hidden
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v1.125h.75A1.5 1.5 0 0 1 21.75 10.125v6.75a1.5 1.5 0 0 1-1.5 1.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 13.5h.01" />
      </svg>
    </span>
  );
}

export default function WalletTreeItem({
  wallet,
  depth = 0,
  expandedIds,
  selectedWalletId,
  onSelect,
  onToggle,
  onAddSubWallet,
}: WalletTreeItemProps) {
  const hasChildren = wallet.children.length > 0;
  const isExpanded = expandedIds.has(wallet.id);
  const isSelected = selectedWalletId === wallet.id;

  return (
    <li>
      <div
        className="group flex items-center gap-1"
        style={{ paddingLeft: `${depth * 18}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(wallet.id)}
          aria-label={isExpanded ? "Collapse wallet" : "Expand wallet"}
          className={[
            "flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-slate-400",
            hasChildren ? "hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200" : "opacity-0",
          ].join(" ")}
        >
          <ChevronIcon isOpen={isExpanded} />
        </button>

        <button
          type="button"
          onClick={() => onSelect(wallet.id)}
          className={[
            "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all",
            isSelected
              ? "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70",
          ].join(" ")}
        >
          <WalletGlyph color={wallet.color} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{wallet.name}</span>
            <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
              {wallet.currency} {Number(wallet.balance).toLocaleString("en-US")}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onAddSubWallet(wallet.id)}
          aria-label={`Add sub-wallet to ${wallet.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
      </div>

      {hasChildren && (
        <div
          className={[
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          ].join(" ")}
        >
          <ul className="min-h-0 overflow-hidden pt-1">
            {wallet.children.map((child) => (
              <WalletTreeItem
                key={child.id}
                wallet={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                selectedWalletId={selectedWalletId}
                onSelect={onSelect}
                onToggle={onToggle}
                onAddSubWallet={onAddSubWallet}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
