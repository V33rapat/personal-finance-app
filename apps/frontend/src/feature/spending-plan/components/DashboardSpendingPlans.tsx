"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useDashboardSpendingPlans } from "../hooks/useSpendingPlan";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function DashboardSpendingPlans() {
  const { plans, isLoading, error, load } = useDashboardSpendingPlans();

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />;
  }

  if (error) {
    return (
      <section aria-labelledby="dashboard-spending-plans-heading">
        <div role="alert" className="flex flex-col gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>ลองใหม่</Button>
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-spending-plans-heading">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 id="dashboard-spending-plans-heading" className="text-lg font-bold text-slate-900 dark:text-slate-50">แผนการใช้เงินที่กำลังติดตาม</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ดูยอดวันนี้ของทุกแผนที่กำลังใช้งาน</p>
        </div>
        <Link href="/spending-plans" className="shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300">ดูทั้งหมด</Link>
      </header>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const remaining = Number(plan.today?.remaining ?? 0);
          const isOver = remaining < 0;
          return (
            <Link key={plan.id} href={`/spending-plans/${plan.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500">
              <Card className="p-5 transition hover:border-violet-300 dark:hover:border-violet-700">
                <h3 className="truncate font-bold text-slate-900 dark:text-slate-50">{plan.name}</h3>
                <p className={`mt-4 text-xl font-bold ${isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{isOver ? "เกินวันนี้ " : "เหลือวันนี้ "}{formatCurrency(Math.abs(remaining).toFixed(2))}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">เหลืออีก {plan.days_remaining} วัน</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
