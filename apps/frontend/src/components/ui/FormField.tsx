// ---------------------------------------------------------------------------
// components/ui/FormField.tsx
// Reusable input field พร้อม label, error state และ optional right slot
// ---------------------------------------------------------------------------

"use client";

import { forwardRef } from "react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightSlot?: React.ReactNode; // สำหรับใส่ปุ่ม show/hide password
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, rightSlot, id, className = "", ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={[
              "w-full rounded-xl border bg-white/60 px-4 py-3 text-sm text-slate-800",
              "placeholder:text-slate-400 backdrop-blur-sm transition-all duration-200",
              "outline-none ring-0",
              "dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500",
              // focus
              "focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20",
              "dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-500/20",
              // error
              error
                ? "border-red-400 ring-2 ring-red-400/20 dark:border-red-500 dark:ring-red-500/20"
                : "border-slate-200 dark:border-slate-700",
              // padding right เผื่อ slot
              rightSlot ? "pr-11" : "",
              className,
            ].join(" ")}
            {...props}
          />

          {rightSlot && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightSlot}
            </div>
          )}
        </div>

        {/* Error message */}
        <div className="min-h-[18px]">
          {error && (
            <p
              id={`${inputId}-error`}
              role="alert"
              className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm0 7.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm.5-3.25a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 1 0v2z"/>
              </svg>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

FormField.displayName = "FormField";
export default FormField;