"use client";

import { FormEvent, useMemo, useState } from "react";
import FormField from "@/components/ui/FormField";
import type { Wallet, WalletFormValues, WalletType } from "../hooks/useWallet";

interface WalletFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  wallet: Wallet | null;
  wallets: Wallet[];
  parentId: string | null;
  onClose: () => void;
  onSave: (values: WalletFormValues) => void;
}

const colorOptions = ["#7c3aed", "#2563eb", "#059669", "#db2777", "#ea580c", "#475569"];

function getInitialValues(wallet: Wallet | null, parentId: string | null): WalletFormValues {
  return {
    name: wallet?.name ?? "",
    description: wallet?.description ?? "",
    wallet_type: wallet?.wallet_type ?? "normal",
    parent_wallet_id: wallet?.parent_wallet_id ?? parentId,
    color: wallet?.color ?? colorOptions[0],
    icon: wallet?.icon ?? "",
  };
}

export default function WalletFormModal({
  isOpen,
  mode,
  wallet,
  wallets,
  parentId,
  onClose,
  onSave,
}: WalletFormModalProps) {
  const [values, setValues] = useState<WalletFormValues>(() => getInitialValues(wallet, parentId));
  const [submitted, setSubmitted] = useState(false);

  const parentOptions = useMemo(
    () => wallets.filter((item) => item.id !== wallet?.id),
    [wallets, wallet]
  );

  if (!isOpen) return null;

  const nameError = submitted && !values.name.trim() ? "Wallet name is required" : "";
  const title = mode === "edit" ? "Edit Wallet" : parentId ? "New Sub-wallet" : "New Wallet";

  const updateValue = <Key extends keyof WalletFormValues>(key: Key, value: WalletFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (!values.name.trim()) return;

    onSave(values);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="wallet-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Keep wallet details simple and easy to scan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <FormField
            label="Wallet Name"
            value={values.name}
            error={nameError}
            placeholder="Savings"
            onChange={(event) => updateValue("name", event.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wallet-description"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
            >
              Description
            </label>
            <textarea
              id="wallet-description"
              value={values.description}
              placeholder="Optional note"
              rows={3}
              onChange={(event) => updateValue("description", event.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="wallet-type"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
              >
                Type
              </label>
              <select
                id="wallet-type"
                value={values.wallet_type}
                onChange={(event) => updateValue("wallet_type", event.target.value as WalletType)}
                className="h-[46px] rounded-xl border border-slate-200 bg-white/60 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
              >
                <option value="normal">Normal</option>
                <option value="investment">Investment</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="wallet-parent"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
              >
                Parent
              </label>
              <select
                id="wallet-parent"
                value={values.parent_wallet_id ?? ""}
                onChange={(event) => updateValue("parent_wallet_id", event.target.value || null)}
                className="h-[46px] rounded-xl border border-slate-200 bg-white/60 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
              >
                <option value="">None</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Color
            </span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateValue("color", color)}
                  aria-label={`Use color ${color}`}
                  className={[
                    "h-8 w-8 rounded-full border-2 transition",
                    values.color === color
                      ? "border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/20"
                      : "border-white ring-1 ring-slate-200 dark:border-slate-900 dark:ring-slate-700",
                  ].join(" ")}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            {mode === "edit" ? "Save Changes" : "Create Wallet"}
          </button>
        </div>
      </form>
    </div>
  );
}
