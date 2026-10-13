"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDisplayDateRange } from "@/lib/dateFormat";
import { useSpendingPlan, type SpendingPlan } from "../hooks/useSpendingPlan";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function statusLabel(status: SpendingPlan["status"]) {
  const labels = {
    scheduled: "กำหนดไว้",
    active: "กำลังติดตาม",
    completed: "จบแผนแล้ว",
    cancelled: "ยกเลิกแล้ว",
  };

  return labels[status];
}

function statusClassName(status: SpendingPlan["status"]) {
  const classNames = {
    scheduled: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  };

  return `rounded-lg ${classNames[status]}`;
}

function SpendingPlanCard({ plan }: { plan: SpendingPlan }) {
  const walletLabel = plan.wallets.length
    ? plan.wallets[0].parent_name
      ? `${plan.wallets[0].parent_name}: ${plan.wallets[0].name}`
      : plan.wallets[0].name
    : "ไม่มีกระเป๋า";

  return (
    <Link href={`/spending-plans/${plan.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500">
      <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-violet-200/50 dark:hover:border-violet-700 dark:hover:shadow-slate-950/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900 dark:text-slate-50">{plan.name}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDisplayDateRange(plan.start_date, plan.end_date)}</p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 text-xs font-semibold ${statusClassName(plan.status)}`}>{statusLabel(plan.status)}</span>
        </div>
        <p className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-50">ยอดรวมแผน {formatCurrency(plan.amount)}</p>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{walletLabel}{plan.wallets.length > 1 ? ` +${plan.wallets.length - 1}` : ""}</span>
          <span>{plan.purpose_count} วัตถุประสงค์</span>
        </div>
        {plan.unavailable_wallet_count > 0 && (
          <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน {plan.unavailable_wallet_count} ใบ</p>
        )}
      </Card>
    </Link>
  );
}

export default function SpendingPlansPage() {
  const { plans, isLoading, error, loadPlans } = useSpendingPlan();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">การวางแผน</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">แผนการใช้เงิน</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">วางวงเงินรายวันตามวัตถุประสงค์ แล้วติดตามค่าใช้จ่ายจริงจากกระเป๋าที่เลือก</p>
        </div>
        <Link href="/spending-plans/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            สร้างแผน
          </Button>
        </Link>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadPlans()}>ลองใหม่</Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
      ) : plans.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <SpendingPlanCard key={plan.id} plan={plan} />)}</div>
      ) : (
        <Card className="border-dashed p-10 text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">ยังไม่มีแผนการใช้เงิน</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">เริ่มจากกำหนดวงเงินและวัตถุประสงค์ที่อยากติดตามในช่วง 1-31 วัน</p>
          <Link href="/spending-plans/new" className="mt-5 inline-flex">
            <Button><Plus className="h-4 w-4" aria-hidden />สร้างแผนแรก</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
