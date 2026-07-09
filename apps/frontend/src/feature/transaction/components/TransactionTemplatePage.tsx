"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { TH_TEXT } from "@/constants/th";
import CategoryCombobox, { type CategoryComboboxHandle } from "./CategoryCombobox";
import type { TransactionType } from "./TransactionItem";
import {
  type TransactionTemplate,
  type TransactionTemplateFormValues,
  useTransactionTemplate,
} from "../hooks/useTransactionTemplate";

type FieldErrors = Partial<Record<keyof TransactionTemplateFormValues, string>>;

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

function getInitialValues(
  template?: TransactionTemplate | null
): TransactionTemplateFormValues {
  return {
    name: template?.name ?? "",
    type: template?.type ?? "expense",
    default_amount: template?.default_amount ?? "",
    category_id: template?.category_id ?? null,
    note: template?.note ?? "",
  };
}

function formatMoney(amount: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function TypeBadge({ type }: { type: TransactionType }) {
  const isIncome = type === "income";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        isIncome
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60",
      ].join(" ")}
    >
      {isIncome ? TH_TEXT.transaction.income : TH_TEXT.transaction.expense}
    </span>
  );
}

function validateTemplate(values: TransactionTemplateFormValues) {
  const errors: FieldErrors = {};
  const amount = Number(values.default_amount);

  if (!values.name.trim()) {
    errors.name = TH_TEXT.transactionTemplate.nameRequired;
  }

  if (!values.default_amount.trim()) {
    errors.default_amount = TH_TEXT.transactionTemplate.amountRequired;
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.default_amount = TH_TEXT.transactionTemplate.amountInvalid;
  }

  return errors;
}

function TemplateForm({
  template,
  isSaving,
  error,
  onCancelEdit,
  onSubmit,
}: {
  template: TransactionTemplate | null;
  isSaving: boolean;
  error: string | null;
  onCancelEdit: () => void;
  onSubmit: (values: TransactionTemplateFormValues) => Promise<boolean>;
}) {
  const categoryComboboxRef = useRef<CategoryComboboxHandle>(null);
  const [values, setValues] = useState<TransactionTemplateFormValues>(() =>
    getInitialValues(template)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const isEditMode = !!template;

  const updateValue = <Key extends keyof TransactionTemplateFormValues>(
    key: Key,
    value: TransactionTemplateFormValues[Key]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateType = (type: TransactionType) => {
    setValues((current) => ({
      ...current,
      type,
      category_id: current.type === type ? current.category_id : null,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) return;

    const nextErrors = validateTemplate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const resolvedCategory = await categoryComboboxRef.current?.resolveCategory();
    const success = await onSubmit({
      ...values,
      category_id: resolvedCategory?.id ?? values.category_id,
    });

    if (!success || isEditMode) return;

    setValues(getInitialValues());
    setErrors({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {isEditMode
            ? TH_TEXT.transactionTemplate.editTemplate
            : TH_TEXT.transactionTemplate.createTemplate}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.transactionTemplate.subtitle}
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {TH_TEXT.transactionTemplate.templateName}
            </label>
            <input
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              placeholder={TH_TEXT.transactionTemplate.templateNamePlaceholder}
              className={inputClassName}
            />
            {errors.name && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {TH_TEXT.transactionTemplate.defaultAmount}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.default_amount}
              onChange={(event) =>
                updateValue("default_amount", event.target.value)
              }
              placeholder={TH_TEXT.transaction.amountPlaceholder}
              className={inputClassName}
            />
            {errors.default_amount && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {errors.default_amount}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {TH_TEXT.transaction.type}
            </span>
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {TH_TEXT.transaction.category}
            </label>
            <CategoryCombobox
              ref={categoryComboboxRef}
              key={values.type}
              type={values.type}
              valueId={values.category_id}
              disabled={isSaving}
              onChange={(category) =>
                updateValue("category_id", category?.id ?? null)
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {TH_TEXT.transaction.note}
          </label>
          <textarea
            value={values.note}
            rows={3}
            placeholder={TH_TEXT.transaction.notePlaceholder}
            onChange={(event) => updateValue("note", event.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
        {isEditMode && (
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving}
            onClick={onCancelEdit}
          >
            {TH_TEXT.common.cancel}
          </Button>
        )}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? TH_TEXT.transfer.savingChanges : TH_TEXT.common.save}
        </Button>
      </div>
    </form>
  );
}

function TemplateList({
  templates,
  isLoading,
  isSaving,
  editingTemplateId,
  onEdit,
  onDelete,
}: {
  templates: TransactionTemplate[];
  isLoading: boolean;
  isSaving: boolean;
  editingTemplateId?: string | null;
  onEdit: (template: TransactionTemplate) => void;
  onDelete: (template: TransactionTemplate) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          {TH_TEXT.transactionTemplate.title}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.transactionTemplate.subtitle}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {TH_TEXT.transactionTemplate.emptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.transactionTemplate.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {templates.map((template) => {
            const isEditing = editingTemplateId === template.id;

            return (
              <article
                key={template.id}
                className={[
                  "rounded-xl border p-4 transition",
                  isEditing
                    ? "border-violet-300 bg-violet-50/70 ring-2 ring-violet-200 dark:border-violet-700 dark:bg-violet-950/20 dark:ring-violet-900/70"
                    : "border-slate-200 bg-slate-50/80 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-violet-900",
                ].join(" ")}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                      {template.name}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {template.note || TH_TEXT.common.none}
                    </p>
                  </div>

                  <div>
                    <TypeBadge type={template.type} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                      {formatMoney(template.default_amount)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {template.category_name ?? TH_TEXT.common.none}
                    </p>
                  </div>

                  <div className="flex gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant={isEditing ? "primary" : "secondary"}
                      size="sm"
                      disabled={isSaving}
                      onClick={() => onEdit(template)}
                    >
                      {TH_TEXT.common.edit}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => onDelete(template)}
                    >
                      {TH_TEXT.common.delete}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function TransactionTemplatePage() {
  const {
    templates,
    isLoading,
    isSaving,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTransactionTemplate();
  const [editingTemplate, setEditingTemplate] =
    useState<TransactionTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] =
    useState<TransactionTemplate | null>(null);

  const formKey = useMemo(
    () => editingTemplate?.id ?? "create",
    [editingTemplate]
  );

  const handleSubmit = async (values: TransactionTemplateFormValues) => {
    if (!editingTemplate) {
      return createTemplate(values);
    }

    const success = await updateTemplate(editingTemplate.id, values);

    if (success) {
      setEditingTemplate(null);
    }

    return success;
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;

    const success = await deleteTemplate(deletingTemplate.id);

    if (success) {
      if (editingTemplate?.id === deletingTemplate.id) {
        setEditingTemplate(null);
      }

      setDeletingTemplate(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {TH_TEXT.transactionTemplate.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {TH_TEXT.transactionTemplate.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {TH_TEXT.transactionTemplate.subtitle}
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <TemplateForm
          key={formKey}
          template={editingTemplate}
          isSaving={isSaving}
          error={error}
          onCancelEdit={() => setEditingTemplate(null)}
          onSubmit={handleSubmit}
        />

        <TemplateList
          templates={templates}
          isLoading={isLoading}
          isSaving={isSaving}
          editingTemplateId={editingTemplate?.id ?? null}
          onEdit={setEditingTemplate}
          onDelete={setDeletingTemplate}
        />
      </div>

      <ConfirmationDialog
        isOpen={!!deletingTemplate}
        title={TH_TEXT.transactionTemplate.deleteConfirmTitle}
        message={TH_TEXT.transactionTemplate.deleteConfirmMessage.replace(
          "%s",
          deletingTemplate?.name ?? ""
        )}
        confirmText={TH_TEXT.common.delete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTemplate(null)}
      />
    </div>
  );
}
