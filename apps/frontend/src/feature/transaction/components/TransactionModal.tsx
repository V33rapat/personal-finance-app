"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import type { Transaction, TransactionType } from "./TransactionItem";

interface TransactionFormValues {
  name: string;
  amount: string;
  type: TransactionType;
  category_id: string | null;
  transaction_date: string;
  note: string;
}

interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

interface TransactionModalProps {
  isOpen: boolean;
  transaction?: Transaction | null;
  walletName?: string;
  categories?: Category[];
  onClose: () => void;
  onSave: (values: TransactionFormValues) => void;
  onUpdate?: (values: TransactionFormValues) => void;
}

const defaultValues: TransactionFormValues = {
  name: "",
  amount: "",
  type: "expense",
  category_id: null,
  transaction_date: new Date().toISOString().split("T")[0],
  note: "",
};

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm0 7.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm.5-3.25a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 1 0v2z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export default function TransactionModal({ isOpen, transaction, walletName, categories = [], onClose, onSave, onUpdate }: TransactionModalProps) {
  const [values, setValues] = useState<TransactionFormValues>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormValues, string>>>({});

  const isEditMode = !!transaction;

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setValues({
          name: transaction.name,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.category_id,
          transaction_date: transaction.transaction_date,
          note: transaction.note ?? "",
        });
      } else {
        setValues(defaultValues);
      }
      setErrors({});
    }
  }, [isOpen, transaction]);

  const handleChange = (field: keyof TransactionFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TransactionFormValues, string>> = {};

    if (!values.name.trim()) {
      newErrors.name = TH_TEXT.transaction.nameRequired;
    }

    if (!values.amount.trim()) {
      newErrors.amount = TH_TEXT.transaction.amountRequired;
    } else if (isNaN(Number(values.amount)) || Number(values.amount) <= 0) {
      newErrors.amount = "กรุณากรอกจำนวนที่ถูกต้อง";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      if (isEditMode && onUpdate) {
        onUpdate(values);
      } else {
        onSave(values);
      }
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((cat) => cat.type === values.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {isEditMode ? TH_TEXT.common.edit : TH_TEXT.transaction.addTransaction}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label={TH_TEXT.common.close}>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {walletName && (
            <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {TH_TEXT.transaction.wallet}: <span className="font-medium">{walletName}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChange("type", "income")}
              className={["flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors", values.type === "income" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"].join(" ")}
            >
              {TH_TEXT.transaction.income}
            </button>
            <button
              type="button"
              onClick={() => handleChange("type", "expense")}
              className={["flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors", values.type === "expense" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"].join(" ")}
            >
              {TH_TEXT.transaction.expense}
            </button>
          </div>

          <FormField label={TH_TEXT.transaction.name} error={errors.name}>
            <input
              type="text"
              value={values.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={TH_TEXT.transaction.namePlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label={TH_TEXT.transaction.amount} error={errors.amount}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder={TH_TEXT.transaction.amountPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label={TH_TEXT.transaction.category}>
            <select
              value={values.category_id ?? ""}
              onChange={(e) => handleChange("category_id", e.target.value || "")}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">{TH_TEXT.transaction.selectCategory}</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={TH_TEXT.transaction.date}>
            <input
              type="date"
              value={values.transaction_date}
              onChange={(e) => handleChange("transaction_date", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label={TH_TEXT.transaction.note}>
            <textarea
              value={values.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder={TH_TEXT.transaction.notePlaceholder}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {TH_TEXT.common.cancel}
            </Button>
            <Button type="submit" className="flex-1">
              {TH_TEXT.common.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}