import type { Metadata } from "next";
import Card from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Dashboard | Walpaca",
  description: "Overview of your personal finance activity.",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          A calm starting point for balances, spending, and upcoming insights.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total Balance", "0 THB"],
          ["Monthly Spending", "0 THB"],
          ["Active Wallets", "0"],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="flex min-h-[280px] items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Dashboard coming next</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            This page is ready for charts, summaries, and recent transactions once the data layer is connected.
          </p>
        </div>
      </Card>
    </div>
  );
}
