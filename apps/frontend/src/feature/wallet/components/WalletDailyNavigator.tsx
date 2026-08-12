"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { th } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import {
  addCalendarDays,
  formatThaiCalendarDate,
  getBangkokToday,
  toCalendarDateString,
  toUtcDate,
} from "../lib/dailyTransactionDate";

const calendarLabels = {
  labelDayButton: (day: Date) => `เลือกวันที่ ${toCalendarDateString(day)}`,
  labelNext: () => "แสดงเดือนถัดไป",
  labelPrevious: () => "แสดงเดือนก่อนหน้า",
};

interface WalletDailyNavigatorProps {
  date: string;
  disabled?: boolean;
  onChange: (date: string) => void;
}

export default function WalletDailyNavigator({
  date,
  disabled = false,
  onChange,
}: WalletDailyNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const today = useMemo(() => getBangkokToday(), []);
  const isToday = date === today;

  const selectDate = (nextDate: Date | undefined) => {
    if (!nextDate) return;
    onChange(toCalendarDateString(nextDate));
    setIsOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        title={TH_TEXT.transaction.previousDay}
        aria-label={TH_TEXT.transaction.previousDay}
        data-testid="daily-previous-day"
        onClick={() => onChange(addCalendarDays(date, -1))}
        disabled={disabled}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-600 dark:hover:text-violet-300"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      <div className="relative min-w-[13rem] flex-1 sm:flex-none">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`${TH_TEXT.transaction.selectDate}: ${date}`}
          data-testid="daily-date-picker-trigger"
          className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-600"
        >
          <span>{formatThaiCalendarDate(date)}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
        </button>

        {isOpen && (
          <div
            role="dialog"
            aria-label={TH_TEXT.transaction.selectDate}
            data-testid="daily-date-picker"
            className="absolute left-0 z-30 mt-2 w-[min(21rem,calc(100vw-3rem))] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <DayPicker
              mode="single"
              selected={toUtcDate(date)}
              onSelect={selectDate}
              locale={th}
              weekStartsOn={1}
              defaultMonth={toUtcDate(date)}
              endMonth={toUtcDate(today)}
              disabled={{ after: toUtcDate(today) }}
              showOutsideDays
              labels={calendarLabels}
              className="dashboard-day-picker mx-auto"
            />
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="secondary"
        disabled={disabled || isToday}
        onClick={() => onChange(today)}
        data-testid="daily-today"
      >
        {TH_TEXT.transaction.today}
      </Button>

      <button
        type="button"
        title={TH_TEXT.transaction.nextDay}
        aria-label={TH_TEXT.transaction.nextDay}
        data-testid="daily-next-day"
        onClick={() => onChange(addCalendarDays(date, 1))}
        disabled={disabled || isToday}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-600 dark:hover:text-violet-300"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
