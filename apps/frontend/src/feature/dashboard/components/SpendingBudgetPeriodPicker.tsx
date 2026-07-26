"use client";

import { useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { th } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import { formatThaiYear, toDateString, toUtcDate } from "../lib/date";
import {
  formatSpendingBudgetPeriodSelection,
  isSevenDaySpendingBudgetWeek,
  type SpendingBudgetPeriodSelection,
} from "../lib/spendingBudget";

interface SpendingBudgetPeriodPickerProps {
  selection: SpendingBudgetPeriodSelection;
  disabled?: boolean;
  onApply: (selection: SpendingBudgetPeriodSelection) => void;
  onReset: () => void;
}

function getSelectionDate(selection: SpendingBudgetPeriodSelection) {
  if (selection.period === "daily") {
    return toUtcDate(selection.date);
  }

  if (selection.period === "weekly") {
    return toUtcDate(selection.start);
  }

  if (selection.period === "monthly") {
    return toUtcDate(`${selection.month}-01`);
  }

  return toUtcDate(`${selection.year}-01-01`);
}

function getDraftRange(
  selection: SpendingBudgetPeriodSelection,
): DateRange | undefined {
  if (selection.period !== "weekly") {
    return undefined;
  }

  return {
    from: toUtcDate(selection.start),
    to: toUtcDate(selection.end),
  };
}

function getThaiMonthNames(year: number) {
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat("th-TH", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, index, 1))),
  }));
}

function getYearOptions(anchorYear: number) {
  return Array.from({ length: 12 }, (_, index) => anchorYear - 5 + index);
}

function getPickerLabel(period: SpendingBudgetPeriodSelection["period"]) {
  if (period === "daily") {
    return TH_TEXT.budget.selectDate;
  }

  if (period === "weekly") {
    return TH_TEXT.budget.selectWeek;
  }

  if (period === "monthly") {
    return TH_TEXT.budget.selectMonth;
  }

  return TH_TEXT.budget.selectYear;
}

function getResetLabel(period: SpendingBudgetPeriodSelection["period"]) {
  if (period === "daily") {
    return TH_TEXT.budget.resetToday;
  }

  if (period === "weekly") {
    return TH_TEXT.budget.resetCurrentWeek;
  }

  if (period === "monthly") {
    return TH_TEXT.budget.resetCurrentMonth;
  }

  return TH_TEXT.budget.resetCurrentYear;
}

const calendarLabels = {
  labelDayButton: (date: Date) => `เลือกวันที่ ${toDateString(date)}`,
  labelNext: () => "แสดงเดือนถัดไป",
  labelPrevious: () => "แสดงเดือนก่อนหน้า",
};

export default function SpendingBudgetPeriodPicker({
  selection,
  disabled = false,
  onApply,
  onReset,
}: SpendingBudgetPeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>();
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [visibleYear, setVisibleYear] = useState(() =>
    getSelectionDate(selection).getUTCFullYear(),
  );
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const monthNames = useMemo(
    () => getThaiMonthNames(visibleYear),
    [visibleYear],
  );
  const yearOptions = useMemo(() => getYearOptions(visibleYear), [visibleYear]);

  const openPicker = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const selectionDate = getSelectionDate(selection);
    setDraftDate(selection.period === "daily" ? selectionDate : undefined);
    setDraftRange(getDraftRange(selection));
    setVisibleYear(selectionDate.getUTCFullYear());
    setSelectionError(null);
    setIsOpen(true);
  };

  const closePicker = () => {
    setSelectionError(null);
    setIsOpen(false);
  };

  const resetSelection = () => {
    onReset();
    closePicker();
  };

  const applyCalendarSelection = () => {
    if (selection.period === "daily") {
      if (!draftDate) {
        setSelectionError(TH_TEXT.budget.dateRequired);
        return;
      }

      onApply({ period: "daily", date: toDateString(draftDate) });
      closePicker();
      return;
    }

    if (selection.period !== "weekly") {
      return;
    }

    if (!draftRange?.from || !draftRange.to) {
      setSelectionError(TH_TEXT.budget.weeklyRangeError);
      return;
    }

    const nextSelection = {
      period: "weekly" as const,
      start: toDateString(draftRange.from),
      end: toDateString(draftRange.to),
    };

    if (!isSevenDaySpendingBudgetWeek(nextSelection)) {
      setSelectionError(TH_TEXT.budget.weeklyRangeError);
      return;
    }

    onApply(nextSelection);
    closePicker();
  };

  const selectMonth = (month: number) => {
    onApply({
      period: "monthly",
      month: `${visibleYear}-${String(month).padStart(2, "0")}`,
    });
    closePicker();
  };

  const selectYear = (year: number) => {
    onApply({ period: "yearly", year: String(year) });
    closePicker();
  };

  const isSelectedMonth = (month: number) =>
    selection.period === "monthly" &&
    selection.month === `${visibleYear}-${String(month).padStart(2, "0")}`;
  const isSelectedYear = (year: number) =>
    selection.period === "yearly" && selection.year === String(year);

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`${getPickerLabel(selection.period)}: ${formatSpendingBudgetPeriodSelection(selection)}`}
        className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-600 sm:min-w-60"
      >
        <span className="min-w-0 truncate">
          {formatSpendingBudgetPeriodSelection(selection)}
        </span>
        <CalendarDays
          className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300"
          aria-hidden
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={getPickerLabel(selection.period)}
          className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {selection.period === "daily" && (
            <DayPicker
              mode="single"
              selected={draftDate}
              onSelect={(nextDate) => {
                setDraftDate(nextDate);
                setSelectionError(null);
              }}
              locale={th}
              weekStartsOn={1}
              defaultMonth={draftDate ?? getSelectionDate(selection)}
              showOutsideDays
              labels={calendarLabels}
              className="dashboard-day-picker mx-auto"
            />
          )}

          {selection.period === "weekly" && (
            <DayPicker
              mode="range"
              selected={draftRange}
              onSelect={(nextRange) => {
                setDraftRange(nextRange);
                setSelectionError(null);
              }}
              locale={th}
              weekStartsOn={1}
              min={6}
              max={6}
              excludeDisabled
              defaultMonth={draftRange?.from ?? getSelectionDate(selection)}
              showOutsideDays
              labels={calendarLabels}
              className="dashboard-day-picker mx-auto"
            />
          )}

          {selection.period === "monthly" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  title="ปีก่อนหน้า"
                  aria-label="ปีก่อนหน้า"
                  onClick={() => setVisibleYear((current) => current - 1)}
                  data-testid="period-picker-previous-year"
                  className="inline-flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatThaiYear(String(visibleYear))}
                </p>
                <button
                  type="button"
                  title="ปีถัดไป"
                  aria-label="ปีถัดไป"
                  onClick={() => setVisibleYear((current) => current + 1)}
                  data-testid="period-picker-next-year"
                  className="inline-flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {monthNames.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    aria-label={`Select month ${visibleYear}-${String(month.value).padStart(2, "0")}`}
                    onClick={() => selectMonth(month.value)}
                    className={[
                      "min-h-10 px-2 text-sm font-semibold transition",
                      isSelectedMonth(month.value)
                        ? "bg-violet-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selection.period === "yearly" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  title="แสดงปีก่อนหน้า"
                  aria-label="แสดงปีก่อนหน้า"
                  onClick={() => setVisibleYear((current) => current - 12)}
                  data-testid="period-picker-previous-year"
                  className="inline-flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatThaiYear(String(yearOptions[0]))} -{" "}
                  {formatThaiYear(String(yearOptions.at(-1)))}
                </p>
                <button
                  type="button"
                  title="แสดงปีถัดไป"
                  aria-label="แสดงปีถัดไป"
                  onClick={() => setVisibleYear((current) => current + 12)}
                  data-testid="period-picker-next-year"
                  className="inline-flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    type="button"
                    aria-label={`Select year ${year}`}
                    onClick={() => selectYear(year)}
                    className={[
                      "min-h-10 px-2 text-sm font-semibold transition",
                      isSelectedYear(year)
                        ? "bg-violet-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {formatThaiYear(String(year))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectionError && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600 dark:text-red-400"
            >
              {selectionError}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={resetSelection}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:text-violet-300"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {getResetLabel(selection.period)}
            </button>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={closePicker}
              >
                {TH_TEXT.common.cancel}
              </Button>
              {(selection.period === "daily" ||
                selection.period === "weekly") && (
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={applyCalendarSelection}
                >
                  {TH_TEXT.budget.applyPeriod}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
