"use client";

import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning";
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = "danger",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} aria-hidden />

      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-full", variant === "danger" ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"].join(" ")}>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {/** Cancel button */}
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {cancelText ?? TH_TEXT.common.cancel}
          </Button>
          {/** Confirm button */}
          <Button
            variant={variant === "danger" ? "danger" : "secondary"}
            className={variant === "danger" ? "flex-1 bg-red-600 text-white hover:bg-red-700" : "flex-1"}
            onClick={onConfirm}
          >
            {confirmText ?? TH_TEXT.common.delete}
          </Button>
        </div>
      </div>
    </div>
  );
}