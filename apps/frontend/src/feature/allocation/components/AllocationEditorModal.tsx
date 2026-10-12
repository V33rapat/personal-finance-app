"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { AllocationFormValues, MoneyAllocation } from "../hooks/useAllocation";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import AllocationForm from "./AllocationForm";

interface AllocationEditorModalProps {
  allocation: MoneyAllocation;
  mode: "edit" | "duplicate";
  initialValues: AllocationFormValues;
  wallets: Wallet[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: AllocationFormValues) => void;
}

export default function AllocationEditorModal({
  allocation,
  mode,
  initialValues,
  wallets,
  isSaving,
  error,
  onClose,
  onSubmit,
}: AllocationEditorModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSaving) onClose();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']",
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-5">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="allocation-editor-title"
        onKeyDown={handleKeyDown}
        className="w-full max-w-[720px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <AllocationForm
          key={`${mode}-${allocation.id}`}
          wallets={wallets}
          isSaving={isSaving}
          error={error}
          mode={mode}
          presentation="modal"
          idPrefix="allocation-editor"
          initialValues={initialValues}
          editingAllocation={mode === "edit" ? allocation : null}
          onCancelEdit={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
