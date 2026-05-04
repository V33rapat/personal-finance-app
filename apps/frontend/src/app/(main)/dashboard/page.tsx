import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import { TH_TEXT } from "@/constants/th";

export const metadata: Metadata = {
  title: TH_TEXT.dashboard.metadataTitle,
  description: TH_TEXT.dashboard.metadataDescription,
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.dashboard.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {TH_TEXT.dashboard.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.dashboard.subtitle}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          [TH_TEXT.dashboard.totalBalance, TH_TEXT.dashboard.zeroBaht],
          [TH_TEXT.dashboard.monthlySpending, TH_TEXT.dashboard.zeroBaht],
          [TH_TEXT.dashboard.activeWallets, "0"],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="flex min-h-[280px] items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{TH_TEXT.dashboard.comingTitle}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.dashboard.comingDescription}
          </p>
        </div>
      </Card>
    </div>
  );
}
