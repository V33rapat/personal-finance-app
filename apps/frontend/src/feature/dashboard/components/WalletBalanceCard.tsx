import Link from "next/link";
import { ChartNoAxesCombined, WalletCards } from "lucide-react";
import { TH_TEXT } from "@/constants/th";
import {
  getWalletSummaryLabel,
  type DashboardWalletSummaryWallet,
} from "../lib/walletSummary";

function formatCurrency(value: string) {
  const amount = Number(value);

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function WalletBalanceCard({
  wallet,
}: {
  wallet: DashboardWalletSummaryWallet;
}) {
  const isInvestment = wallet.wallet_type === "investment";
  const Icon = isInvestment ? ChartNoAxesCombined : WalletCards;
  const balance = Number(wallet.balance);

  return (
    <Link
      href={`/wallet?walletId=${encodeURIComponent(wallet.id)}`}
      aria-label={`${getWalletSummaryLabel(wallet)} ${formatCurrency(wallet.balance)}`}
      className="group min-h-[146px] rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-violet-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40 dark:hover:border-violet-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            style={{ color: wallet.color ?? undefined }}
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
              {getWalletSummaryLabel(wallet)}
            </h3>
            {isInvestment && (
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {TH_TEXT.dashboard.investmentPortfolio}
              </p>
            )}
          </div>
        </div>
      </div>

      <p
        className={[
          "mt-6 text-2xl font-bold tracking-tight",
          balance < 0
            ? "text-rose-700 dark:text-rose-300"
            : "text-slate-900 dark:text-slate-50",
        ].join(" ")}
      >
        {formatCurrency(wallet.balance)}
      </p>
    </Link>
  );
}
