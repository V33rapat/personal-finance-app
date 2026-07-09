"use client";

import { TH_TEXT } from "@/constants/th";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import type { Transfer } from "../hooks/useTransfer";

interface TransferBalancePreviewProps {
  sourceWallet: Wallet | null;
  destinationWallet: Wallet | null;
  amount: string;
  editingTransfer?: Transfer | null;
}

function toMoneyNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(amount: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getEditableBaseBalance(wallet: Wallet | null, editingTransfer?: Transfer | null) {
  const currentBalance = toMoneyNumber(wallet?.balance);
  const existingAmount = toMoneyNumber(editingTransfer?.amount);

  if (!wallet || !editingTransfer || !Number.isFinite(existingAmount)) {
    return currentBalance;
  }

  if (wallet.id === editingTransfer.from_wallet_id) {
    return currentBalance + existingAmount;
  }

  if (wallet.id === editingTransfer.to_wallet_id) {
    return currentBalance - existingAmount;
  }

  return currentBalance;
}

function BalancePanel({
  label,
  wallet,
  nextBalance,
  tone,
}: {
  label: string;
  wallet: Wallet | null;
  nextBalance: number;
  tone: "source" | "destination";
}) {
  const currentBalance = toMoneyNumber(wallet?.balance);
  const currency = wallet?.currency ?? "THB";
  const toneClasses =
    tone === "source"
      ? "border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20"
      : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20";

  return (
    <div className={["rounded-2xl border p-4", toneClasses].join(" ")}>
      <div className="flex items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full bg-slate-300"
          style={{ backgroundColor: wallet?.color ?? undefined }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {wallet?.name ?? TH_TEXT.common.none}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {TH_TEXT.transfer.currentBalance}
          </p>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">
            {formatMoney(currentBalance, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {TH_TEXT.transfer.afterTransfer}
          </p>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-50">
            {formatMoney(nextBalance, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TransferBalancePreview({
  sourceWallet,
  destinationWallet,
  amount,
  editingTransfer,
}: TransferBalancePreviewProps) {
  const transferAmount = toMoneyNumber(amount);
  const sourceBalance = getEditableBaseBalance(sourceWallet, editingTransfer);
  const destinationBalance = getEditableBaseBalance(
    destinationWallet,
    editingTransfer
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.transfer.previewTitle}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {TH_TEXT.transfer.previewDescription}
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BalancePanel
          label={TH_TEXT.transfer.sourceWallet}
          wallet={sourceWallet}
          nextBalance={sourceBalance - transferAmount}
          tone="source"
        />
        <BalancePanel
          label={TH_TEXT.transfer.destinationWallet}
          wallet={destinationWallet}
          nextBalance={destinationBalance + transferAmount}
          tone="destination"
        />
      </div>
    </section>
  );
}
