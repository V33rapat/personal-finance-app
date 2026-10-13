"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { DayPicker } from "react-day-picker";
import { th } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { TH_TEXT } from "@/constants/th";
import {
  formatDateDraft,
  formatDateInput,
  formatDisplayDate,
  fromLocalCalendarDate,
  getDateDraftCaretPosition,
  parseDisplayDate,
  toLocalCalendarDate,
} from "@/lib/dateFormat";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  onDraftValidityChange?: (isValid: boolean) => void;
  id?: string;
  label?: string;
  "aria-label"?: string;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

function getBoundedMonth(date: Date, min?: Date, max?: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const minMonth = min ? new Date(min.getFullYear(), min.getMonth(), 1) : undefined;
  const maxMonth = max ? new Date(max.getFullYear(), max.getMonth(), 1) : undefined;

  if (minMonth && monthStart < minMonth) return minMonth;
  if (maxMonth && monthStart > maxMonth) return maxMonth;
  return monthStart;
}

export default function DateField({
  value,
  onChange,
  onDraftValidityChange,
  id,
  label,
  "aria-label": ariaLabel,
  error,
  min,
  max,
  disabled = false,
  className = "",
  testId,
}: DateFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `date-field-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const validityCallbackRef = useRef(onDraftValidityChange);
  const [draft, setDraft] = useState(() => formatDateInput(value));
  const [lastValue, setLastValue] = useState(value);
  const [lastSubmittedValue, setLastSubmittedValue] = useState<string | null>(null);
  const [isFormatInvalid, setIsFormatInvalid] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const selectedDate = toLocalCalendarDate(value);
  const minDate = min ? toLocalCalendarDate(min) : undefined;
  const maxDate = max ? toLocalCalendarDate(max) : undefined;
  const displayedError = isFormatInvalid
    ? TH_TEXT.common.invalidDateFormat
    : error;

  if (value !== lastValue) {
    setLastValue(value);
    // A parent echo must not replace a newer draft typed before that render.
    if (value !== lastSubmittedValue) {
      setDraft(formatDateInput(value));
      setIsFormatInvalid(false);
    }
  }

  const submitValue = (nextValue: string) => {
    setLastSubmittedValue(nextValue);
    onChange(nextValue);
  };

  useEffect(() => {
    validityCallbackRef.current = onDraftValidityChange;
  }, [onDraftValidityChange]);

  const reportValidity = useCallback((isValid: boolean, showFormatError = false) => {
    setIsFormatInvalid(!isValid && showFormatError);
    validityCallbackRef.current?.(isValid);
  }, []);

  useLayoutEffect(() => {
    if (!isCalendarOpen) return;

    const positionCalendar = () => {
      const input = inputRef.current;
      const calendar = calendarRef.current;
      if (!input || !calendar) return;
      const rect = input.getBoundingClientRect();
      const margin = 8;
      const below = Math.max(0, window.innerHeight - rect.bottom - margin * 2);
      const above = Math.max(0, rect.top - margin * 2);
      const openAbove = calendar.scrollHeight > below && above > below;
      const availableHeight = openAbove ? above : below;
      calendar.style.maxHeight = `${availableHeight}px`;
      const height = Math.min(calendar.scrollHeight, availableHeight);
      calendar.style.top = `${openAbove ? rect.top - margin - height : rect.bottom + margin}px`;
      calendar.style.left = `${Math.max(margin, Math.min(rect.right - calendar.offsetWidth, window.innerWidth - calendar.offsetWidth - margin))}px`;
    };

    positionCalendar();
    window.addEventListener("resize", positionCalendar);
    window.addEventListener("scroll", positionCalendar, true);
    return () => {
      window.removeEventListener("resize", positionCalendar);
      window.removeEventListener("scroll", positionCalendar, true);
    };
  }, [isCalendarOpen, calendarMonth]);

  useEffect(() => {
    if (!isCalendarOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsCalendarOpen(false);
      inputRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCalendarOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const rawValue = input.value;
    const digitsBeforeCaret = rawValue
      .slice(0, input.selectionStart ?? rawValue.length)
      .replace(/\D/g, "").length;
    const nextDraft = formatDateDraft(rawValue);

    setDraft(nextDraft);

    if (!nextDraft) {
      reportValidity(true);
      submitValue("");
    } else {
      const parsedDate = parseDisplayDate(nextDraft);
      reportValidity(Boolean(parsedDate), nextDraft.length === 10 && !parsedDate);
      if (parsedDate) {
        submitValue(parsedDate);
      }
    }

    requestAnimationFrame(() => {
      const nextPosition = getDateDraftCaretPosition(nextDraft, digitsBeforeCaret);
      inputRef.current?.setSelectionRange(nextPosition, nextPosition);
    });
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === null || end === null || start !== end) return;

    if (event.key === "Backspace" && draft[start - 1] === "/") {
      event.preventDefault();
      const removeIndex = start - 2;
      if (removeIndex < 0) return;
      const digitsBeforeCaret = draft.slice(0, removeIndex).replace(/\D/g, "").length;
      const nextDraft = formatDateDraft(
        `${draft.slice(0, removeIndex)}${draft.slice(removeIndex + 1)}`
      );
      setDraft(nextDraft);
      const parsedDate = parseDisplayDate(nextDraft);
      reportValidity(
        !nextDraft || Boolean(parsedDate),
        nextDraft.length === 10 && !parsedDate
      );
      if (parsedDate) submitValue(parsedDate);
      if (!nextDraft) submitValue("");
      requestAnimationFrame(() => {
        const nextPosition = getDateDraftCaretPosition(nextDraft, digitsBeforeCaret);
        inputRef.current?.setSelectionRange(nextPosition, nextPosition);
      });
    }

    if (event.key === "Delete" && draft[start] === "/") {
      event.preventDefault();
      const removeIndex = start + 1;
      const digitsBeforeCaret = draft.slice(0, removeIndex).replace(/\D/g, "").length;
      const nextDraft = formatDateDraft(
        `${draft.slice(0, removeIndex)}${draft.slice(removeIndex + 1)}`
      );
      setDraft(nextDraft);
      const parsedDate = parseDisplayDate(nextDraft);
      reportValidity(
        !nextDraft || Boolean(parsedDate),
        nextDraft.length === 10 && !parsedDate
      );
      if (parsedDate) submitValue(parsedDate);
      if (!nextDraft) submitValue("");
      requestAnimationFrame(() => {
        const nextPosition = getDateDraftCaretPosition(nextDraft, digitsBeforeCaret);
        inputRef.current?.setSelectionRange(nextPosition, nextPosition);
      });
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const currentDraft = formatDateDraft(event.currentTarget.value);
    setDraft(currentDraft);
    if (!currentDraft) {
      reportValidity(true);
      submitValue("");
      return;
    }

    const parsedDate = parseDisplayDate(currentDraft);
    reportValidity(Boolean(parsedDate), true);
    if (parsedDate) submitValue(parsedDate);
  };

  const toggleCalendar = () => {
    if (disabled) return;
    const baseDate = selectedDate ?? new Date();
    setCalendarMonth(getBoundedMonth(baseDate, minDate, maxDate));
    setIsCalendarOpen((current) => !current);
  };

  const selectCalendarDate = (date: Date | undefined) => {
    if (!date) return;
    const isoDate = fromLocalCalendarDate(date);
    setDraft(formatDateInput(isoDate));
    reportValidity(true);
    submitValue(isoDate);
    setIsCalendarOpen(false);
    inputRef.current?.focus();
  };

  const disabledDates = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <div ref={rootRef} className="relative min-w-0">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={10}
          placeholder="DD/MM/YYYY"
          pattern={"\\d{2}/\\d{2}/\\d{4}"}
          value={draft}
          disabled={disabled}
          aria-label={ariaLabel ?? (label ? undefined : TH_TEXT.common.date)}
          aria-invalid={Boolean(displayedError)}
          aria-describedby={displayedError ? `${inputId}-error` : undefined}
          data-testid={testId}
          data-min={min || undefined}
          data-max={max || undefined}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className={[
            "w-full rounded-lg border bg-white px-3 py-2.5 pr-11 text-sm text-slate-800 outline-none transition",
            "placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
            "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            displayedError
              ? "border-red-400 dark:border-red-500"
              : "border-slate-200 dark:border-slate-700",
            disabled ? "cursor-not-allowed opacity-60" : "",
            className,
          ].join(" ")}
        />
        <button
          type="button"
          aria-label={`${TH_TEXT.common.selectDateFromCalendar}${label ? `: ${label}` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={isCalendarOpen}
          disabled={disabled}
          onClick={toggleCalendar}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:text-violet-300"
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {displayedError && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-500 dark:text-red-400"
        >
          {displayedError}
        </p>
      )}
      {isCalendarOpen && (
        <div
          ref={calendarRef}
          role="dialog"
          aria-label={`${TH_TEXT.common.selectDateFromCalendar}${label ? `: ${label}` : ""}`}
          className="fixed z-40 w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <DayPicker
            mode="single"
            locale={th}
            weekStartsOn={1}
            selected={selectedDate}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelect={selectCalendarDate}
            disabled={disabledDates}
            startMonth={minDate}
            endMonth={maxDate}
            showOutsideDays
            labels={{
              labelPrevious: () => TH_TEXT.common.previousMonth,
              labelNext: () => TH_TEXT.common.nextMonth,
              labelDayButton: (date) =>
                `${TH_TEXT.common.selectDateFromCalendar}: ${formatDisplayDate(fromLocalCalendarDate(date))}`,
            }}
            className="dashboard-day-picker mx-auto"
          />
        </div>
      )}
    </div>
  );
}
