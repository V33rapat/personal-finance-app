"use client";

import { useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { th } from "date-fns/locale";
import { CalendarDays, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import { formatDisplayDateRange } from "@/lib/dateFormat";
import {
  getBangkokToday,
  getDayCount,
  toDateString,
  toUtcDate,
  type DashboardDateRange,
} from "../lib/date";

interface DashboardDateRangePickerProps {
  range: DashboardDateRange;
  disabled?: boolean;
  onApply: (range: DashboardDateRange) => void;
  onReset: () => void;
}

function toPickerRange(range: DashboardDateRange): DateRange {
  return { from: toUtcDate(range.start), to: toUtcDate(range.end) };
}

export default function DashboardDateRangePicker({
  range,
  disabled = false,
  onApply,
  onReset,
}: DashboardDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    toPickerRange(range)
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const today = useMemo(() => toUtcDate(getBangkokToday()), []);

  const applyRange = () => {
    if (!draftRange?.from) {
      setRangeError(TH_TEXT.dashboard.selectDateRangeError);
      return;
    }

    const start = toDateString(draftRange.from);
    const end = toDateString(draftRange.to ?? draftRange.from);

    if (getDayCount(start, end) > 10) {
      setRangeError(TH_TEXT.dashboard.maximumRangeError);
      return;
    }

    onApply({ start, end });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          setDraftRange(toPickerRange(range));
          setRangeError(null);
          setIsOpen(true);
        }}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`${TH_TEXT.dashboard.selectDateRange}: ${formatDisplayDateRange(range.start, range.end)}`}
        className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-600"
      >
        <span className="min-w-0 truncate">{formatDisplayDateRange(range.start, range.end)}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={TH_TEXT.dashboard.selectDateRange}
          className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <DayPicker
            mode="range"
            selected={draftRange}
            onSelect={(nextRange) => {
              setDraftRange(nextRange);
              setRangeError(null);
            }}
            locale={th}
            labels={{
              labelDayButton: (date) => `เลือกวันที่ ${toDateString(date)}`,
              labelNext: () => "แสดงเดือนถัดไป",
              labelPrevious: () => "แสดงเดือนก่อนหน้า",
            }}
            weekStartsOn={1}
            max={10}
            disabled={{ after: today }}
            excludeDisabled
            defaultMonth={draftRange?.from ?? toUtcDate(range.start)}
            endMonth={today}
            showOutsideDays
            className="dashboard-day-picker mx-auto"
          />

          {rangeError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{rangeError}</p>}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onReset();
                setIsOpen(false);
              }}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:text-violet-300"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {TH_TEXT.dashboard.resetToCurrentWeek}
            </button>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => setIsOpen(false)}
              >
                {TH_TEXT.common.cancel}
              </Button>
              <Button size="sm" disabled={disabled} onClick={applyRange}>
                {TH_TEXT.dashboard.applyDateRange}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
