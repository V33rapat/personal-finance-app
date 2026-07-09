"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { TH_TEXT } from "@/constants/th";
import CategoryCombobox, { type CategoryComboboxHandle } from "./CategoryCombobox";
import type { Transaction, TransactionType } from "./TransactionItem";
import { useTransactionTemplate } from "../hooks/useTransactionTemplate";


interface TransactionFormValues {
  name: string;
  amount: string;
  type: TransactionType;
  category_id: string | null;
  template_id?: string | null;
  transaction_date: string;
  note: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  transaction?: Transaction | null;
  walletName?: string;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (values: TransactionFormValues) => void | Promise<unknown>;
  onUpdate?: (values: TransactionFormValues) => void | Promise<unknown>;
}

interface TransactionModalFormProps extends Omit<TransactionModalProps, "isOpen" | "transaction"> {
  initialValues: TransactionFormValues;
  isEditMode: boolean;
}

function getDefaultValues(): TransactionFormValues {
  return {
    name: "",
    amount: "",
    type: "expense",
    category_id: null,
    template_id: null,
    transaction_date: new Date().toISOString().split("T")[0],
    note: "",
  };
}

function getInitialValues(transaction?: Transaction | null): TransactionFormValues {
  if (!transaction) return getDefaultValues();

  return {
    name: transaction.name,
    amount: transaction.amount,
    type: transaction.type,
    category_id: transaction.category_id,
    template_id: transaction.template_id ?? null,
    transaction_date: transaction.transaction_date,
    note: transaction.note ?? "",
  };
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
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

function TransactionModalForm({
  initialValues,
  isEditMode,
  walletName,
  isSaving = false,
  error,
  onClose,
  onSave,
  onUpdate,
}: TransactionModalFormProps) {
  const categoryComboboxRef = useRef<CategoryComboboxHandle>(null);
  const { templates, isLoading: isTemplateLoading } = useTransactionTemplate({
    autoLoad: !isEditMode,
  });
  const [values, setValues] = useState<TransactionFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormValues, string>>>({});

  const updateValue = <Key extends keyof TransactionFormValues>(
    field: Key,
    value: TransactionFormValues[Key]
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof TransactionFormValues, string>> = {};
    
    const amount = Number(values.amount);

    if (!values.name.trim()) {
      nextErrors.name = TH_TEXT.transaction.nameRequired;
    }

    if (!values.amount.trim()) {
      nextErrors.amount = TH_TEXT.transaction.amountRequired;
    } else if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "กรุณากรอกจำนวนเงินที่ถูกต้อง";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };


  const updateType = (type: TransactionType) => {
    setValues((current) => ({ 
      ...current, 
      type, 
      category_id: current.type === type ? current.category_id : null
    }));
  };

  const applyTemplate = (templateId: string) => {
    if (!templateId) {
      setValues((current) => ({ ...current, template_id: null }));
      return;
    }

    const template = templates.find((item) => item.id === templateId);

    if (!template) return;

    setValues((current) => ({
      ...current,
      template_id: template.id,
      name: template.name,
      amount: template.default_amount,
      type: template.type,
      category_id: template.category_id,
      note: template.note,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate() || isSaving) return;

    const resolvedCategory = await categoryComboboxRef.current?.resolveCategory();
    const submitValues = {
      ...values,
      category_id: resolvedCategory?.id ?? values.category_id,
    };

    if (isEditMode && onUpdate) {
      void onUpdate(submitValues);
      return;
    }

    void onSave(submitValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label={TH_TEXT.common.close}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {isEditMode ? TH_TEXT.common.edit : TH_TEXT.transaction.addTransaction}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label={TH_TEXT.common.close}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {walletName && (
            <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {TH_TEXT.transaction.wallet}: <span className="font-medium">{walletName}</span>
            </div>
          )}

          {!isEditMode && (
            <FormField label={TH_TEXT.transactionTemplate.selectTemplate}>
              <select
                value={values.template_id ?? ""}
                disabled={isSaving || isTemplateLoading}
                onChange={(event) => applyTemplate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">
                  {TH_TEXT.transactionTemplate.noTemplateSelected}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {Number(template.default_amount).toLocaleString("th-TH")}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {TH_TEXT.transactionTemplate.applyHint}
              </p>
            </FormField>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateType("income")}
              className={[
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                values.type === "income"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              ].join(" ")}
            >
              {TH_TEXT.transaction.income}
            </button>
            <button
              type="button"
              onClick={() => updateType("expense")}
              className={[
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                values.type === "expense"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              ].join(" ")}
            >
              {TH_TEXT.transaction.expense}
            </button>
          </div>

          <FormField label={TH_TEXT.transaction.name} error={errors.name}>
            <input
              type="text"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
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
              onChange={(event) => updateValue("amount", event.target.value)}
              placeholder={TH_TEXT.transaction.amountPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label={TH_TEXT.transaction.category}>
            <CategoryCombobox
              ref={categoryComboboxRef}
              key={values.type}
              type={values.type}
              valueId={values.category_id}
              disabled={isSaving}
              onChange={(category) => updateValue("category_id", category?.id ?? null)}
            />
          </FormField>

          <FormField label={TH_TEXT.transaction.date}>
            <input
              type="date"
              value={values.transaction_date}
              onChange={(event) => updateValue("transaction_date", event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label={TH_TEXT.transaction.note}>
            <textarea
              value={values.note}
              onChange={(event) => updateValue("note", event.target.value)}
              placeholder={TH_TEXT.transaction.notePlaceholder}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {TH_TEXT.common.cancel}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {TH_TEXT.common.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TransactionModal({
  isOpen,
  transaction,
  ...props
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <TransactionModalForm
      key={transaction?.id ?? "new"}
      initialValues={getInitialValues(transaction)}
      isEditMode={!!transaction}
      {...props}
    />
  );
}
