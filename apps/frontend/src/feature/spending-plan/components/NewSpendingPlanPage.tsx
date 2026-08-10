"use client";

import { useRouter } from "next/navigation";
import { getBangkokToday } from "@/feature/dashboard/lib/date";
import { createPurpose } from "../lib/spendingPlan";
import { useSpendingPlan } from "../hooks/useSpendingPlan";
import SpendingPlanEditor from "./SpendingPlanEditor";

export default function NewSpendingPlanPage() {
  const router = useRouter();
  const { createPlan, isSaving } = useSpendingPlan(false);
  const today = getBangkokToday();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">แผนการใช้เงิน</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">สร้างแผนใหม่</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">กำหนดวงเงินในแต่ละวันให้รวมเท่ากับยอดรวมของแผน</p>
      </header>
      <SpendingPlanEditor
        initialValues={{
          name: "",
          amount: "",
          start_date: today,
          end_date: today,
          wallet_ids: [],
          purposes: [createPurpose([today], 1)],
        }}
        isSaving={isSaving}
        submitLabel="สร้างแผน"
        onSubmit={async (values) => {
          const result = await createPlan(values);
          if (result.success && result.plan) {
            router.push(`/spending-plans/${result.plan.id}`);
          }
          return result;
        }}
        onCancel={() => router.push("/spending-plans")}
      />
    </div>
  );
}
