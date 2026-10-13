"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatCalendarYear,
  formatMonthName,
  formatMonthValue,
  isMonthAfter,
  parseMonthValue,
  toMonthValue,
} from "../lib/dashboardMonth";

interface DashboardMonthPickerLabels {
  reportingPeriod: string;
  selectMonth: string;
  previousYear: string;
  nextYear: string;
  monthOptions: string;
}

interface DashboardMonthPickerProps {
  value: string;
  maximum: string;
  locale: string;
  labels: DashboardMonthPickerLabels;
  onChange: (value: string) => void;
}

export default function DashboardMonthPicker({
  value,
  maximum,
  locale,
  labels,
  onChange,
}: DashboardMonthPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedMonthButtonRef = useRef<HTMLButtonElement>(null);
  const selected = parseMonthValue(value);
  const maximumMonth = parseMonthValue(maximum);
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(selected?.year ?? new Date().getFullYear());
  const monthLabel = formatMonthValue(value, locale);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) selectedMonthButtonRef.current?.focus();
  }, [isOpen]);

  const togglePicker = () => {
    if (!isOpen && selected) setDisplayYear(selected.year);
    setIsOpen((open) => !open);
  };

  const selectMonth = (month: number) => {
    const nextValue = toMonthValue(displayYear, month);
    if (isMonthAfter(nextValue, maximum)) return;

    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const canShowNextYear = !maximumMonth || displayYear < maximumMonth.year;

  return (
    <div ref={rootRef} className="relative sm:w-[190px]">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {labels.reportingPeriod}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${labels.reportingPeriod}: ${monthLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-testid="dashboard-month-picker-trigger"
        onClick={togglePicker}
        className="flex h-[46px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 text-left text-sm font-medium text-slate-800 outline-none transition hover:border-violet-300 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-violet-600 dark:focus-visible:border-violet-500 dark:focus-visible:ring-violet-500/20"
      >
        <span className="truncate">{monthLabel}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={labels.selectMonth}
          data-testid="dashboard-month-picker-dialog"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={labels.previousYear}
              data-testid="dashboard-month-picker-previous-year"
              onClick={() => setDisplayYear((year) => year - 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCalendarYear(displayYear, locale)}
            </p>
            <button
              type="button"
              aria-label={labels.nextYear}
              data-testid="dashboard-month-picker-next-year"
              disabled={!canShowNextYear}
              onClick={() => setDisplayYear((year) => year + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div role="group" aria-label={labels.monthOptions} className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => {
              const month = index + 1;
              const monthValue = toMonthValue(displayYear, month);
              const isSelected = monthValue === value;
              const isDisabled = isMonthAfter(monthValue, maximum);
              const monthName = formatMonthName(month, locale);

              return (
                <button
                  key={monthValue}
                  ref={isSelected ? selectedMonthButtonRef : undefined}
                  type="button"
                  aria-label={`${monthName} ${formatCalendarYear(displayYear, locale)}`}
                  aria-pressed={isSelected}
                  data-testid={`dashboard-month-option-${monthValue}`}
                  disabled={isDisabled}
                  onClick={() => selectMonth(month)}
                  className={[
                    "min-h-10 rounded-lg border px-2 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500",
                    isSelected
                      ? "border-violet-500 bg-violet-50 font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                      : "border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
                    isDisabled ? "cursor-not-allowed opacity-40 hover:border-slate-200 hover:bg-transparent dark:hover:bg-transparent" : "",
                  ].join(" ")}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
