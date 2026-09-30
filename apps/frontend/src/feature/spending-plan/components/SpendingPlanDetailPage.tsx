"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Settings2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import DateField from "@/components/ui/DateField";
import { TH_TEXT } from "@/constants/th";
import { getBangkokToday } from "@/feature/dashboard/lib/date";
import { formatDisplayDate } from "@/lib/dateFormat";
import {
  createPurpose,
  type SpendingPlanDistributionType,
  type SpendingPlanFormValues,
  type SpendingPlanView,
} from "../lib/spendingPlan";
import {
  useSpendingPlan,
  type SpendingPlanDay,
  type SpendingPlanDayPurpose,
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
  return formatDisplayDate(value);
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

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDayCount(start: string, end: string) {
  return Math.floor(
    (new Date(`${end}T00:00:00.000Z`).getTime() -
      new Date(`${start}T00:00:00.000Z`).getTime()) /
      86_400_000,
  ) + 1;
}

function dayClassName(day: SpendingPlanDay) {
  if (day.status === "over") return "border-rose-300 bg-rose-50 dark:border-rose-900/70 dark:bg-rose-950/30";
  if (day.status === "warning") return "border-amber-300 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30";
  if (day.status === "planned") return "border-sky-200 bg-sky-50/60 dark:border-sky-900/70 dark:bg-sky-950/20";
  return "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
}

function remainingClassName(value: string | number) {
  return Number(value) < 0
    ? "text-rose-600 dark:text-rose-400"
    : "text-emerald-600 dark:text-emerald-400";
}

function getRemainingLabel(day: SpendingPlanDay | SpendingPlanDayPurpose) {
  if (day.status === "planned") return "รอติดตาม";
  const remaining = Number(day.remaining);
  return remaining < 0
    ? `เกิน ${formatCurrency(Math.abs(remaining))}`
    : `เหลือ ${formatCurrency(remaining)}`;
}

function getStatusClassName(status: SpendingPlanDay["status"]) {
  switch (status) {
    case "over":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    case "planned":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
}

function getProgressPercent(actual: string | number, planned: string | number) {
  const actualAmount = Number(actual);
  const plannedAmount = Number(planned);
  if (plannedAmount <= 0) return actualAmount > 0 ? 100 : 0;
  return Math.min((actualAmount / plannedAmount) * 100, 100);
}

function formatDistribution(type: SpendingPlanDistributionType | null | undefined) {
  switch (type) {
    case "equal_daily":
      return "แบ่งเท่ากันทุกวัน";
    case "weekdays":
      return "วันทำงาน (จันทร์-ศุกร์)";
    case "weekly":
      return "ซ้ำทุกสัปดาห์";
    case "biweekly":
      return "ซ้ำทุก 2 สัปดาห์";
    case "specific_dates":
      return "เลือกวันเจาะจง";
    default:
      return "รูปแบบเดิม";
  }
}

function getEditorValues(detail: SpendingPlanDetail, effectiveDate: string): SpendingPlanFormValues {
  const revision = detail.revisions
    .slice()
    .sort((left, right) => left.effective_date.localeCompare(right.effective_date))
    .filter((item) => item.effective_date <= effectiveDate)
    .at(-1) ?? detail.revisions.at(-1);
  return {
    name: detail.name,
    start_date: detail.start_date,
    end_date: detail.end_date,
    wallet_ids: revision?.wallet_ids ?? [],
    purposes: revision?.purposes.map((purpose, index) => ({
      id: `revision-purpose-${index}`,
      name: purpose.name,
      category_ids: purpose.category_ids,
      target_amount: purpose.target_amount ?? "",
      distribution: purpose.distribution
        ? {
            type: purpose.distribution.type,
            weekdays: purpose.distribution.weekdays,
            dates: purpose.distribution.dates,
          }
        : { type: null, weekdays: [], dates: [] },
    })) ?? [createPurpose(1)],
  };
}

function PlanCalendar({
  days,
  visiblePurposeNames,
  showDailyBalance,
  selectedDate,
  onSelect,
  onOpenDaily,
}: {
  days: SpendingPlanDay[];
  visiblePurposeNames: string[];
  showDailyBalance: boolean;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onOpenDaily: (date: string) => void;
}) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const firstDay = days[0]?.date
    ? (new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay() + 6) % 7
    : 0;
  const displayedNames = visiblePurposeNames.length
    ? visiblePurposeNames
    : days[0]?.purposes.slice(0, 5).map((purpose) => purpose.name) ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="min-w-[938px]">
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/70">
          {["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"].map((label, index) => (
            <span
              key={label}
              className={`px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-300 ${index < 6 ? "border-r border-slate-200 dark:border-slate-700" : ""}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, index) => (
            <div
              key={`blank-${index}`}
              className={`min-h-40 border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/20 ${index % 7 < 6 ? "border-r" : ""}`}
            />
          ))}
          {days.map((day, index) => {
            const progress = getProgressPercent(day.actual, day.planned);
            const showOverviewAction = hoveredDate === day.date || selectedDate === day.date;
            const statusColor =
              day.status === "over"
                ? "bg-rose-500"
                : day.status === "warning"
                  ? "bg-amber-500"
                  : day.status === "planned"
                    ? "bg-slate-400"
                    : "bg-emerald-500";

            return (
              <div
                key={day.date}
                className={`group relative min-h-40 border-b p-3 text-left transition hover:relative hover:z-10 hover:outline hover:outline-2 hover:outline-violet-400 ${(firstDay + index) % 7 < 6 ? "border-r" : ""} ${dayClassName(day)} ${selectedDate === day.date ? "relative z-10 outline outline-2 outline-violet-500 outline-offset-[-2px]" : ""}`}
                onMouseEnter={() => setHoveredDate(day.date)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <button
                  type="button"
                  onClick={() => onSelect(day.date)}
                  onFocus={() => setHoveredDate(day.date)}
                  className="flex h-full min-h-32 w-full flex-col pb-8 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 focus-visible:outline-offset-[-2px]"
                  aria-label={`เลือกวันที่ ${day.date}`}
                  aria-pressed={selectedDate === day.date}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {new Date(`${day.date}T00:00:00.000Z`).getUTCDate()}
                    </span>
                    {showDailyBalance && (
                      <span className={`text-right text-[11px] font-bold ${remainingClassName(day.remaining)}`}>
                        {getRemainingLabel(day)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-1">
                    {displayedNames.map((name) => {
                      const purpose = day.purposes.find((item) => item.name === name);
                      if (!purpose) return null;
                      return (
                        <span key={name} className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="truncate">{name}</span>
                          <b className={purpose.status === "over" ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"}>
                            {formatCurrency(purpose.actual)}
                          </b>
                        </span>
                      );
                    })}
                  </div>
                  <span className="mt-auto block h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <span className={`block h-full ${statusColor}`} style={{ width: `${progress}%` }} />
                  </span>
                </button>
                {showOverviewAction && (
                  <button
                    type="button"
                    onClick={() => onOpenDaily(day.date)}
                    onFocus={() => setHoveredDate(day.date)}
                    className="absolute bottom-2 left-3 right-3 z-10 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 focus-visible:outline-offset-2"
                  >
                    ดูภาพรวม
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlanRangeTable({
  days,
  selectedDate,
  onSelect,
}: {
  days: SpendingPlanDay[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const purposeNames = [
    ...new Set(days.flatMap((day) => day.purposes.map((purpose) => purpose.name))),
  ];

  return (
    <div className="max-h-[640px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-[1000px] w-full border-collapse text-sm">
        <thead className="border-y border-slate-200 text-left text-xs font-semibold uppercase tracking-widest text-slate-500 dark:border-slate-800">
          <tr>
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 dark:bg-slate-800">วันที่</th>
            {purposeNames.map((name) => (
              <th key={name} className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right dark:bg-slate-800">{name}</th>
            ))}
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right dark:bg-slate-800">รวมใช้จริง / แผน</th>
            <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 dark:bg-slate-800">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr
              key={day.date}
              tabIndex={0}
              onClick={() => onSelect(day.date)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(day.date);
                }
              }}
              className={`cursor-pointer border-b border-slate-100 transition hover:bg-violet-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-slate-800 dark:hover:bg-violet-950/20 ${selectedDate === day.date ? "bg-violet-50 dark:bg-violet-950/30" : ""}`}
              aria-label={`เลือกวันที่ ${day.date}`}
            >
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{formatThaiDate(day.date)}</td>
              {purposeNames.map((name) => {
                const purpose = day.purposes.find((item) => item.name === name);
                return (
                  <td key={name} className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                    {purpose ? (
                      <><b className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(purpose.actual)}</b><span className="text-slate-400"> / {formatCurrency(purpose.planned)}</span></>
                    ) : "-"}
                  </td>
                );
              })}
              <td className="whitespace-nowrap px-4 py-3 text-right"><b className="text-slate-900 dark:text-slate-50">{formatCurrency(day.actual)}</b><span className="text-slate-400"> / {formatCurrency(day.planned)}</span></td>
              <td className="px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${getStatusClassName(day.status)}`}>{getRemainingLabel(day)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayDetail({ day }: { day: SpendingPlanDay | null }) {
  if (!day) return null;

  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {day.purposes.map((purpose) => {
          const isOver = Number(purpose.remaining) < 0 || purpose.is_unplanned;
          const progressColor = isOver ? "bg-rose-500" : "bg-emerald-500";

          return (
            <article key={purpose.name} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50">{purpose.name}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">วางแผน {formatCurrency(purpose.planned)}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className={`h-full ${progressColor}`} style={{ width: `${getProgressPercent(purpose.actual, purpose.planned)}%` }} />
              </div>
              <div className={`mt-3 flex items-center justify-between gap-3 text-sm font-bold ${isOver ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"}`}>
                <span>{formatCurrency(purpose.actual)}</span>
                <span>{getRemainingLabel(purpose)}</span>
              </div>
              {purpose.is_unplanned && <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">รายจ่ายนอกแผน</p>}
            </article>
          );
        })}
      </div>
      <div className="mt-5 grid overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-3 dark:border-slate-700">
        {[{ label: "งบของวันนี้", value: day.planned }, { label: "ใช้ไปแล้ว", value: day.actual }, { label: "เหลือ / เกิน", value: day.remaining }].map((item, index) => (
          <div key={item.label} className={`p-4 ${index < 2 ? "border-b sm:border-r sm:border-b-0" : ""} border-slate-200 dark:border-slate-700`}>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`mt-2 text-lg font-bold ${item.label === "เหลือ / เกิน" ? remainingClassName(item.value) : "text-slate-900 dark:text-slate-50"}`}>{item.label === "เหลือ / เกิน" ? getRemainingLabel(day) : formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function SpendingPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loadPlan, updatePlan, cancelPlan, copyPlan, updatePreferences, isSaving, error } = useSpendingPlan(false);
  const [detail, setDetail] = useState<SpendingPlanDetail | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [view, setView] = useState<SpendingPlanView>("monthly");
  const [showDailyBalance, setShowDailyBalance] = useState(true);
  const [visiblePurposeNames, setVisiblePurposeNames] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copyStartDate, setCopyStartDate] = useState(getBangkokToday());
  const [isCopyDateDraftValid, setIsCopyDateDraftValid] = useState(true);
  const [revisionEffectiveDate, setRevisionEffectiveDate] = useState("");
  const [isRevisionDateDraftValid, setIsRevisionDateDraftValid] = useState(true);

  const load = useCallback(async (requestedMonth?: string) => {
    const next = await loadPlan(params.id, requestedMonth);
    if (next) {
      setDetail(next);
      setMonth(next.view.month);
      setView(next.preferences.last_view);
      setShowDailyBalance(next.preferences.show_daily_balance);
      setVisiblePurposeNames(next.preferences.visible_purpose_names);
      setSelectedDate((current) =>
        current && next.view.range_days.some((day) => day.date === current)
          ? current
          : null,
      );
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
  const isEditable = detail.status !== "cancelled";
  const canCancel = detail.status === "active" || detail.status === "scheduled";
  const latestRevision = detail.revisions[0];
  const isLegacyCopy =
    latestRevision?.purposes.some((purpose) => purpose.distribution === null) ?? false;
  const minimumEffectiveDate = detail.start_date;
  const effectiveDate = revisionEffectiveDate || minimumEffectiveDate;
  const nextRevision = detail.revisions
    .slice()
    .sort((left, right) => left.effective_date.localeCompare(right.effective_date))
    .find((revision) => revision.effective_date > effectiveDate);
  const effectiveEndDate = nextRevision ? addDays(nextRevision.effective_date, -1) : detail.end_date;
  const copyEndDate = addDays(copyStartDate, getDayCount(detail.start_date, detail.end_date) - 1);
  const planSummary = detail.view.range_days.reduce(
    (summary, day) => ({
      planned: summary.planned + Number(day.planned),
      actual: summary.actual + Number(day.actual),
      overDays: summary.overDays + (day.status === "over" ? 1 : 0),
    }),
    { planned: 0, actual: 0, overDays: 0 },
  );
  const planRemaining = planSummary.planned - planSummary.actual;

  const savePreference = async (changes: { last_view?: SpendingPlanView; show_daily_balance?: boolean; visible_purpose_names?: string[] }) => {
    const saved = await updatePreferences(detail.id, changes);
    setView(saved.last_view);
    setShowDailyBalance(saved.show_daily_balance);
    setVisiblePurposeNames(saved.visible_purpose_names);
  };

  const submitCopy = () => {
    if (!copyStartDate || !isCopyDateDraftValid || isSaving) return;

    void copyPlan(detail.id, { start_date: copyStartDate, end_date: copyEndDate }).then((plan) => {
      if (plan) {
        setIsCopyOpen(false);
        router.push(`/spending-plans/${plan.id}`);
      }
    });
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">แผนการใช้เงิน</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">แก้ไข {detail.name}</h1>
          <div className="mt-4 max-w-xs">
            <DateField
              id="spending-plan-revision-date"
              label="ให้ Revision มีผลตั้งแต่"
              min={minimumEffectiveDate}
              max={detail.end_date}
              value={effectiveDate}
              onChange={setRevisionEffectiveDate}
              onDraftValidityChange={setIsRevisionDateDraftValid}
              testId="spending-plan-revision-date"
            />
          </div>
        </header>
        <SpendingPlanEditor
          key={effectiveDate}
          initialValues={getEditorValues(detail, effectiveDate)}
          effectiveDate={effectiveDate}
          effectiveEndDate={effectiveEndDate}
          isSaving={isSaving}
          submitLabel="บันทึกเป็น Revision ใหม่"
          onSubmit={async (values) => {
            if (!isRevisionDateDraftValid) {
              return {
                success: false,
                validationErrors: { dates: TH_TEXT.common.invalidDateFormat },
              };
            }
            const result = await updatePlan(
              detail.id,
              effectiveDate,
              values,
              effectiveEndDate,
            );
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
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatThaiDate(detail.start_date)} - {formatThaiDate(detail.end_date)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions"><Button><Plus className="h-4 w-4" aria-hidden />เพิ่มรายการ</Button></Link>
          {isEditable && <Button variant="secondary" onClick={() => { setRevisionEffectiveDate(minimumEffectiveDate); setIsEditing(true); }}><Pencil className="h-4 w-4" aria-hidden />แก้ไขแผน</Button>}
          <Button
            variant="secondary"
            onClick={() => setIsCopyOpen(true)}
          >
            คัดลอกแผน
          </Button>
          {canCancel && <Button variant="danger" onClick={() => setIsCancelOpen(true)}>ยกเลิกแผน</Button>}
        </div>
      </header>

      {isCopyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="ปิดหน้าต่างคัดลอกแผน"
            className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setIsCopyOpen(false)}
            disabled={isSaving}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-spending-plan-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-900"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h2 id="copy-spending-plan-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  คัดลอกแผนการใช้เงิน
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  ตรวจสอบรายละเอียดก่อนสร้างแผนใหม่จากแผนนี้
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyOpen(false)}
                disabled={isSaving}
                aria-label="ปิดหน้าต่างคัดลอกแผน"
                title="ปิดหน้าต่าง"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/20">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">แผนต้นฉบับ</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{detail.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatThaiDate(detail.start_date)} - {formatThaiDate(detail.end_date)}</p>
              </div>

              {isLegacyCopy ? (
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">แผนนี้ใช้รูปแบบเดิม</p>
                  <p>ระบบจะเปิดหน้าเตรียมสำเนาให้คุณตั้งค่ารูปแบบการกระจายเงินใหม่ก่อนสร้างแผน</p>
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitCopy();
                  }}
                  className="space-y-4"
                >
                  <DateField
                    id="spending-plan-copy-start-date"
                    label="วันเริ่มต้นของแผนใหม่"
                    value={copyStartDate}
                    onChange={setCopyStartDate}
                    onDraftValidityChange={setIsCopyDateDraftValid}
                    disabled={isSaving}
                    testId="spending-plan-copy-start-date"
                  />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    แผนใหม่จะสิ้นสุดวันที่ {formatThaiDate(copyEndDate)} โดยคงความยาวเท่ากับแผนต้นฉบับ
                  </p>
                  <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" disabled={isSaving} onClick={() => setIsCopyOpen(false)}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={isSaving || !copyStartDate || !isCopyDateDraftValid}>
                      {isSaving ? "กำลังสร้างสำเนา" : "ยืนยันคัดลอกแผน"}
                    </Button>
                  </div>
                </form>
              )}

              {isLegacyCopy && (
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={isSaving} onClick={() => setIsCopyOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="button" disabled={isSaving} onClick={() => router.push(`/spending-plans/new?copyFrom=${detail.id}`)}>
                    ไปเตรียมสำเนา
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {detail.unavailable_wallet_count > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน รายจ่ายใหม่จากกระเป๋านั้นจะไม่ถูกนับ แต่ข้อมูลเดิมยังอยู่ในประวัติ</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <Card className="overflow-hidden p-0">
        <section className="flex flex-col gap-4 border-b border-slate-200 px-5 py-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">แผนการใช้เงิน</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">วางแผนล่วงหน้า แล้วติดตามว่าใช้จริงเป็นไปตามแผนหรือไม่</p>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">รอบแผน {formatThaiDate(detail.start_date)} - {formatThaiDate(detail.end_date)}</p>
        </section>

        <section className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">
          {[
            { label: "งบตามแผน", value: formatCurrency(planSummary.planned), className: "text-slate-900 dark:text-slate-50" },
            { label: "ใช้ไปแล้ว", value: formatCurrency(planSummary.actual), className: "text-slate-900 dark:text-slate-50" },
            { label: "ยังเหลือทั้งแผน", value: planRemaining < 0 ? `เกิน ${formatCurrency(Math.abs(planRemaining))}` : `เหลือ ${formatCurrency(planRemaining)}`, className: remainingClassName(planRemaining) },
            { label: "วันที่เกินแผน", value: `${planSummary.overDays} วัน`, className: planSummary.overDays > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-50" },
          ].map((item, index) => (
            <div key={item.label} className={`p-5 sm:px-7 ${index < 3 ? "border-b sm:border-r xl:border-b-0" : ""} border-slate-200 dark:border-slate-800`}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className={`mt-2 text-xl font-bold ${item.className}`}>{item.value}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/20 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto dark:border-slate-700 dark:bg-slate-800">
            {[{ id: "monthly", label: "ภาพรวมรายเดือน" }, { id: "range", label: "ตารางตามช่วงเวลา" }, { id: "daily", label: "ภาพรวมต่อวัน" }].map((item) => (
              <button key={item.id} type="button" onClick={() => void savePreference({ last_view: item.id as SpendingPlanView })} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${view === item.id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50" : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-50"}`}>{item.label}</button>
            ))}
          </div>
          {view === "monthly" && <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"><button type="button" disabled={!canGoPrevious} onClick={() => void load(previousMonth)} aria-label="เดือนก่อนหน้า" className="rounded-lg p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden /></button><span className="min-w-40 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{getMonthLabel(month)}</span><button type="button" disabled={!canGoNext} onClick={() => void load(nextMonth)} aria-label="เดือนถัดไป" className="rounded-lg p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden /></button></div>}
          {view !== "monthly" && <p className="text-sm text-slate-500 dark:text-slate-400">เลือกวันจากตารางเพื่อเปิดภาพรวมต่อวัน</p>}
        </section>

        {view === "monthly" && (
          <section className="px-5 py-6 sm:px-7">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{getMonthLabel(month)}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">แสดงยอดใช้จริงของวัตถุประสงค์ที่เลือก และสถานะของแต่ละวัน</p></div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsSettingsOpen((current) => !current)}><Settings2 className="h-4 w-4" aria-hidden />ปรับสิ่งที่แสดง</Button>
            </header>
            {isSettingsOpen && <aside className="ml-auto mt-4 max-w-md rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/70 dark:bg-violet-950/20"><h3 className="font-semibold text-slate-900 dark:text-slate-50">การแสดงผลในภาพรวมรายเดือน</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">เลือกวัตถุประสงค์ที่อยากติดตามบนทุกวันได้สูงสุด 5 รายการ</p><label className="mt-4 flex items-center justify-between gap-3 border-t border-violet-100 pt-3 text-sm text-slate-700 dark:border-violet-900/60 dark:text-slate-200"><span>แสดงยอดเหลือหรือเกินของวัน</span><input type="checkbox" checked={showDailyBalance} onChange={(event) => void savePreference({ show_daily_balance: event.target.checked })} className="h-4 w-4 accent-violet-600" /></label><fieldset className="mt-4"><legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">วัตถุประสงค์ที่แสดง (สูงสุด 5)</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{purposeNames.map((name) => { const checked = visiblePurposeNames.includes(name); const disabled = !checked && visiblePurposeNames.length >= 5; return <label key={name} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => { const next = event.target.checked ? [...visiblePurposeNames, name] : visiblePurposeNames.filter((item) => item !== name); void savePreference({ visible_purpose_names: next }); }} className="h-4 w-4 accent-violet-600" />{name}</label>; })}</div></fieldset></aside>}
            <div className="mt-5"><PlanCalendar days={detail.view.days} visiblePurposeNames={visiblePurposeNames} showDailyBalance={showDailyBalance} selectedDate={selectedDate} onSelect={setSelectedDate} onOpenDaily={(date) => { setSelectedDate(date); void savePreference({ last_view: "daily" }); }} /></div>
          </section>
        )}

        {view === "range" && <section className="px-5 py-6 sm:px-7"><div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/70 dark:bg-violet-950/20 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-slate-50">แผนตามช่วงเวลา: {formatThaiDate(detail.start_date)} - {formatThaiDate(detail.end_date)}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ไล่อ่านจากบนลงล่างเพื่อเทียบแผนและการใช้จริงของทุกวัน</p></div><Button type="button" variant="secondary" size="sm" disabled={!selectedDate} onClick={() => void savePreference({ last_view: "daily" })}>เปิดวันที่เลือก</Button></div><PlanRangeTable days={detail.view.range_days} selectedDate={selectedDate} onSelect={setSelectedDate} /></section>}

        {view === "daily" && currentDay && <section className="px-5 py-6 sm:px-7"><div className="flex flex-col gap-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/70 dark:bg-violet-950/20 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{formatThaiDate(currentDay.date)}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ใช้จริงเทียบกับแผนของวันนี้แยกตามวัตถุประสงค์</p></div><div className="flex items-center gap-3"><select value={currentDay.date} onChange={(event) => setSelectedDate(event.target.value)} aria-label="เลือกวันที่ดูภาพรวม" className="h-10 max-w-48 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{detail.view.range_days.map((day) => <option key={day.date} value={day.date}>{formatThaiDate(day.date)}</option>)}</select><strong className={`text-lg ${remainingClassName(currentDay.remaining)}`}>{getRemainingLabel(currentDay)}</strong></div></div><DayDetail day={currentDay} /></section>}
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">ประวัติ Revision</h2>
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {detail.revisions.map((revision) => (
            <li key={revision.id} className="py-3 text-sm">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-800 marker:hidden dark:text-slate-100">
                  <span>มีผลตั้งแต่ {formatThaiDate(revision.effective_date)}</span>
                  <span className="text-slate-500 dark:text-slate-400">{revision.purposes.length} วัตถุประสงค์</span>
                </summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {revision.purposes.map((purpose) => (
                    <div key={purpose.name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{purpose.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{purpose.categories.map((category) => category.name).join(", ")}</p>
                      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{formatDistribution(purpose.distribution?.type)}</p>
                      {purpose.target_amount === null ? (
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">รูปแบบเดิม: ต้องตั้งวงเงินต่อครั้งใหม่</p>
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">วงเงินต่อครั้ง {formatCurrency(purpose.target_amount)}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">รวมช่วงนี้ {formatCurrency(purpose.planned_total)}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmationDialog isOpen={isCancelOpen} title="ยกเลิกแผนการใช้เงิน?" message="แผนจะหยุดติดตามรายจ่ายใหม่ แต่ข้อมูลและประวัติทั้งหมดจะยังเก็บไว้" confirmText="ยกเลิกแผน" onConfirm={() => void cancelPlan(detail.id).then((success) => { if (success) { setIsCancelOpen(false); void load(month); } })} onCancel={() => setIsCancelOpen(false)} isLoading={isSaving} />
    </div>
  );
}
