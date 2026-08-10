"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { getBangkokToday } from "@/feature/dashboard/lib/date";
import { createPurpose, type SpendingPlanFormValues, type SpendingPlanView } from "../lib/spendingPlan";
import {
  useSpendingPlan,
  type SpendingPlanDay,
  type SpendingPlanDetail,
} from "../hooks/useSpendingPlan";
import SpendingPlanEditor from "./SpendingPlanEditor";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getMonthLabel(month: string) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

function getAdjacentMonth(month: string, direction: -1 | 1) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
  return date.toISOString().slice(0, 7);
}

function dayClassName(day: SpendingPlanDay) {
  if (day.status === "over") return "border-rose-300 bg-rose-50 dark:border-rose-900/70 dark:bg-rose-950/30";
  if (day.status === "warning") return "border-amber-300 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30";
  if (day.status === "planned") return "border-sky-200 bg-sky-50/60 dark:border-sky-900/70 dark:bg-sky-950/20";
  return "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
}

function getEditorValues(detail: SpendingPlanDetail): SpendingPlanFormValues {
  const revision = detail.revisions.find((item) => item.id === detail.current_revision_id) ?? detail.revisions[0];
  const dates = detail.view.range_days.map((day) => day.date);

  return {
    name: detail.name,
    amount: detail.amount,
    start_date: detail.start_date,
    end_date: detail.end_date,
    wallet_ids: revision?.wallet_ids ?? [],
    purposes: revision?.purposes.map((purpose, index) => ({
      id: `revision-purpose-${index}`,
      name: purpose.name,
      category_ids: purpose.category_ids,
      allocations: purpose.allocations.map((allocation) => ({
        date: allocation.date,
        amount: allocation.amount,
      })),
    })) ?? [createPurpose(dates, 1)],
  };
}

function PlanCalendar({
  days,
  visiblePurposeNames,
  showDailyBalance,
  onSelect,
}: {
  days: SpendingPlanDay[];
  visiblePurposeNames: string[];
  showDailyBalance: boolean;
  onSelect: (date: string) => void;
}) {
  const firstDay = days[0]?.date ? new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay() : 0;
  const displayedNames = visiblePurposeNames.length
    ? visiblePurposeNames
    : days[0]?.purposes.slice(0, 5).map((purpose) => purpose.name) ?? [];

  return (
    <div className="grid grid-cols-7 gap-2">
      {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((label) => (
        <span key={label} className="px-1 text-center text-xs font-semibold text-slate-400">{label}</span>
      ))}
      {Array.from({ length: firstDay }).map((_, index) => <div key={`blank-${index}`} />)}
      {days.map((day) => (
        <button
          type="button"
          key={day.date}
          onClick={() => onSelect(day.date)}
          className={`min-h-32 border p-2 text-left transition hover:border-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${dayClassName(day)}`}
          aria-label={`ดูรายละเอียดวันที่ ${day.date}`}
        >
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{new Date(`${day.date}T00:00:00.000Z`).getUTCDate()}</span>
          <div className="mt-2 space-y-1">
            {displayedNames.map((name) => {
              const purpose = day.purposes.find((item) => item.name === name);
              if (!purpose) return null;
              return <p key={name} className="truncate text-[11px] text-slate-600 dark:text-slate-300">{name}: {formatCurrency(purpose.remaining)}</p>;
            })}
          </div>
          {showDailyBalance && <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">เหลือ {formatCurrency(day.remaining)}</p>}
        </button>
      ))}
    </div>
  );
}

function PlanRangeTable({ days }: { days: SpendingPlanDay[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full text-sm">
        <thead className="border-y border-slate-200 text-left text-xs font-semibold uppercase tracking-widest text-slate-500 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">วันที่</th>
            <th className="px-4 py-3">วัตถุประสงค์</th>
            <th className="px-4 py-3 text-right">วางแผน</th>
            <th className="px-4 py-3 text-right">ใช้จริง</th>
            <th className="px-4 py-3 text-right">คงเหลือ</th>
          </tr>
        </thead>
        <tbody>
          {days.flatMap((day) => day.purposes.map((purpose, index) => (
            <tr key={`${day.date}-${purpose.name}`} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{index === 0 ? formatThaiDate(day.date) : ""}</td>
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{purpose.name}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(purpose.planned)}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(purpose.actual)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${Number(purpose.remaining) < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{formatCurrency(purpose.remaining)}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

function DayDetail({ day }: { day: SpendingPlanDay | null }) {
  if (!day) return null;
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">ภาพรวมต่อวัน: {formatThaiDate(day.date)}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[{ label: "วางแผน", value: day.planned }, { label: "ใช้จริง", value: day.actual }, { label: "เหลือ", value: day.remaining }].map((item) => (
          <div key={item.label} className="border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {day.purposes.map((purpose) => (
          <div key={purpose.name} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
            <div><p className="font-semibold text-slate-900 dark:text-slate-50">{purpose.name}</p><p className="mt-1 text-slate-500 dark:text-slate-400">ใช้ {formatCurrency(purpose.actual)} จาก {formatCurrency(purpose.planned)}</p></div>
            <p className={`self-center font-bold ${Number(purpose.remaining) < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{formatCurrency(purpose.remaining)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SpendingPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const { loadPlan, updatePlan, cancelPlan, updatePreferences, isSaving, error } = useSpendingPlan(false);
  const [detail, setDetail] = useState<SpendingPlanDetail | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [view, setView] = useState<SpendingPlanView>("monthly");
  const [showDailyBalance, setShowDailyBalance] = useState(true);
  const [visiblePurposeNames, setVisiblePurposeNames] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const load = useCallback(async (requestedMonth?: string) => {
    const next = await loadPlan(params.id, requestedMonth);
    if (next) {
      setDetail(next);
      setMonth(next.view.month);
      setView(next.preferences.last_view);
      setShowDailyBalance(next.preferences.show_daily_balance);
      setVisiblePurposeNames(next.preferences.visible_purpose_names);
      setSelectedDate((current) => current ?? next.view.days[0]?.date ?? null);
    }
  }, [loadPlan, params.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const purposeNames = useMemo(() => detail?.view.days[0]?.purposes.map((purpose) => purpose.name) ?? [], [detail]);
  const currentDay = useMemo(() => {
    const allDays = detail?.view.range_days ?? [];
    return allDays.find((day) => day.date === selectedDate) ?? detail?.view.days[0] ?? null;
  }, [detail, selectedDate]);

  if (!detail || !month) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />;
  }

  const previousMonth = getAdjacentMonth(month, -1);
  const nextMonth = getAdjacentMonth(month, 1);
  const canGoPrevious = previousMonth >= detail.start_date.slice(0, 7);
  const canGoNext = nextMonth <= detail.end_date.slice(0, 7);
  const isEditable = detail.status === "active" || detail.status === "scheduled";
  const effectiveDate = detail.start_date > getBangkokToday() ? detail.start_date : getBangkokToday();

  const savePreference = async (changes: { last_view?: SpendingPlanView; show_daily_balance?: boolean; visible_purpose_names?: string[] }) => {
    const saved = await updatePreferences(detail.id, changes);
    setView(saved.last_view);
    setShowDailyBalance(saved.show_daily_balance);
    setVisiblePurposeNames(saved.visible_purpose_names);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-6">
        <header><p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">แผนการใช้เงิน</p><h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">แก้ไข {detail.name}</h1></header>
        <SpendingPlanEditor
          initialValues={getEditorValues(detail)}
          effectiveDate={effectiveDate}
          isSaving={isSaving}
          submitLabel="บันทึกเป็น Revision ใหม่"
          onSubmit={async (values) => {
            const result = await updatePlan(detail.id, effectiveDate, values);
            if (result.success) {
              setIsEditing(false);
              await load(month);
            }
            return result;
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link href="/spending-plans" className="text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300">แผนการใช้เงิน</Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{detail.name}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatThaiDate(detail.start_date)} - {formatThaiDate(detail.end_date)} · วงเงิน {formatCurrency(detail.amount)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditable && <Button variant="secondary" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" aria-hidden />แก้ไขแผน</Button>}
          {isEditable && <Button variant="danger" onClick={() => setIsCancelOpen(true)}>ยกเลิกแผน</Button>}
        </div>
      </header>

      {detail.unavailable_wallet_count > 0 && <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน รายจ่ายใหม่จากกระเป๋านั้นจะไม่ถูกนับ แต่ข้อมูลเดิมยังอยู่ในประวัติ</div>}
      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full overflow-hidden border border-slate-200 sm:w-auto dark:border-slate-700">
            {[{ id: "monthly", label: "ภาพรวมรายเดือน" }, { id: "range", label: "ตารางตามช่วงเวลา" }, { id: "daily", label: "ภาพรวมต่อวัน" }].map((item) => (
              <button key={item.id} type="button" onClick={() => void savePreference({ last_view: item.id as SpendingPlanView })} className={`flex-1 px-3 py-2 text-sm font-semibold transition sm:flex-none ${view === item.id ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{item.label}</button>
            ))}
          </div>
          {view === "monthly" && <div className="flex items-center justify-between gap-2 border border-slate-200 p-1 dark:border-slate-700"><button type="button" disabled={!canGoPrevious} onClick={() => void load(previousMonth)} aria-label="เดือนก่อนหน้า" className="p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden /></button><span className="min-w-40 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{getMonthLabel(month)}</span><button type="button" disabled={!canGoNext} onClick={() => void load(nextMonth)} aria-label="เดือนถัดไป" className="p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden /></button></div>}
        </div>
      </Card>

      {view === "monthly" && (
        <Card className="p-4 sm:p-6">
          <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">ภาพรวมรายเดือน</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">เหลือหรือเกินของแต่ละวัตถุประสงค์ตามวัน</p></div>
            <button type="button" onClick={() => setIsSettingsOpen((current) => !current)} className="inline-flex items-center gap-2 self-start px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Settings2 className="h-4 w-4" aria-hidden />ตั้งค่าการแสดง</button>
          </header>
          {isSettingsOpen && <div className="mt-4 border border-slate-200 p-4 dark:border-slate-700"><label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={showDailyBalance} onChange={(event) => void savePreference({ show_daily_balance: event.target.checked })} className="h-4 w-4 accent-violet-600" />แสดงยอดเหลือหรือเกินของแต่ละวัน</label><fieldset className="mt-4"><legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">วัตถุประสงค์ที่แสดง (สูงสุด 5)</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{purposeNames.map((name) => { const checked = visiblePurposeNames.includes(name); const disabled = !checked && visiblePurposeNames.length >= 5; return <label key={name} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => { const next = event.target.checked ? [...visiblePurposeNames, name] : visiblePurposeNames.filter((item) => item !== name); void savePreference({ visible_purpose_names: next }); }} className="h-4 w-4 accent-violet-600" />{name}</label>; })}</div></fieldset></div>}
          <div className="mt-5"><PlanCalendar days={detail.view.days} visiblePurposeNames={visiblePurposeNames} showDailyBalance={showDailyBalance} onSelect={(date) => { setSelectedDate(date); void savePreference({ last_view: "daily" }); }} /></div>
        </Card>
      )}

      {view === "range" && <Card className="overflow-hidden"><header className="border-b border-slate-100 p-5 dark:border-slate-800"><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">ตารางตามช่วงเวลา</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ติดตามยอดตามวันและวัตถุประสงค์ตลอดทั้งแผน</p></header><PlanRangeTable days={detail.view.range_days} /></Card>}
      {view === "daily" && <div className="space-y-4"><div className="flex flex-wrap gap-2">{detail.view.range_days.map((day) => <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} className={`border px-3 py-2 text-sm font-semibold ${selectedDate === day.date ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{formatThaiDate(day.date)}</button>)}</div><DayDetail day={currentDay} /></div>}

      <Card className="p-5"><h2 className="text-base font-bold text-slate-900 dark:text-slate-50">ประวัติ Revision</h2><ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">{detail.revisions.map((revision) => <li key={revision.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="font-medium text-slate-800 dark:text-slate-100">มีผลตั้งแต่ {formatThaiDate(revision.effective_date)}</span><span className="text-slate-500 dark:text-slate-400">{revision.purposes.length} วัตถุประสงค์</span></li>)}</ul></Card>

      <ConfirmationDialog isOpen={isCancelOpen} title="ยกเลิกแผนการใช้เงิน?" message="แผนจะหยุดติดตามรายจ่ายใหม่ แต่ข้อมูลและประวัติทั้งหมดจะยังเก็บไว้" confirmText="ยกเลิกแผน" onConfirm={() => void cancelPlan(detail.id).then((success) => { if (success) { setIsCancelOpen(false); void load(month); } })} onCancel={() => setIsCancelOpen(false)} isLoading={isSaving} />
    </div>
  );
}
