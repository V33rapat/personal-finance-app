"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBangkokToday } from "@/feature/dashboard/lib/date";
import { createPurpose, type SpendingPlanFormValues } from "../lib/spendingPlan";
import { useSpendingPlan, type SpendingPlanDetail } from "../hooks/useSpendingPlan";
import SpendingPlanEditor from "./SpendingPlanEditor";

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDayCount(start: string, end: string) {
  return (
    Math.floor(
      (new Date(`${end}T00:00:00.000Z`).getTime() -
        new Date(`${start}T00:00:00.000Z`).getTime()) /
        86_400_000,
    ) + 1
  );
}

function getInitialValues(today: string): SpendingPlanFormValues {
  return {
    name: "",
    start_date: today,
    end_date: today,
    wallet_ids: [],
    purposes: [createPurpose(1)],
  };
}

function getCopyValues(detail: SpendingPlanDetail, today: string): SpendingPlanFormValues {
  const sourceRevision = detail.revisions[0];
  const dayCount = getDayCount(detail.start_date, detail.end_date);
  const offsetDays = Math.floor(
    (new Date(`${today}T00:00:00.000Z`).getTime() -
      new Date(`${detail.start_date}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
  const newEndDate = addDays(today, dayCount - 1);

  return {
    name: `${detail.name} (สำเนา)`,
    start_date: today,
    end_date: newEndDate,
    wallet_ids: sourceRevision?.wallet_ids ?? [],
    purposes:
      sourceRevision?.purposes.map((purpose, index) => ({
        id: `copy-purpose-${index}`,
        name: purpose.name,
        target_amount: purpose.target_amount ?? "",
        category_ids: purpose.category_ids,
        distribution: purpose.distribution
          ? {
              type: purpose.distribution.type,
              weekdays: purpose.distribution.weekdays,
              dates: purpose.distribution.dates
                .map((date) => addDays(date, offsetDays))
                .filter((date) => date >= today && date <= newEndDate),
            }
          : { type: null, weekdays: [], dates: [] },
      })) ?? [createPurpose(1)],
  };
}

export default function NewSpendingPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createPlan, isSaving, loadPlan } = useSpendingPlan(false);
  const today = getBangkokToday();
  const copyFrom = searchParams.get("copyFrom");
  const [initialValues, setInitialValues] = useState(() => getInitialValues(today));
  const [isLoadingCopy, setIsLoadingCopy] = useState(Boolean(copyFrom));

  useEffect(() => {
    if (!copyFrom) {
      return;
    }

    let isCurrent = true;
    void loadPlan(copyFrom).then((detail) => {
      if (!isCurrent) return;
      if (detail) {
        setInitialValues(getCopyValues(detail, today));
      }
      setIsLoadingCopy(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [copyFrom, loadPlan, today]);

  if (isLoadingCopy) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">แผนการใช้เงิน</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{copyFrom ? "สร้างสำเนาแผน" : "สร้างแผนใหม่"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">กำหนดวงเงินต่อครั้งของแต่ละวัตถุประสงค์ แล้วเลือกรูปแบบวันที่ให้ระบบคำนวณเอง</p>
      </header>
      <SpendingPlanEditor
        initialValues={initialValues}
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
