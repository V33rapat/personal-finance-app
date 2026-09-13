"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { Plus, Search, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import { useCategory } from "@/feature/transaction/hooks/useCategory";
import { getTransactionWalletOptions } from "@/feature/transaction/lib/transactionWallet";
import { useWallet } from "@/feature/wallet/hooks/useWallet";
import {
  createPurpose,
  getDistributionPreview,
  getProjectedPlanTotal,
  getPlanDates,
  type SpendingPlanDistributionType,
  type SpendingPlanFormValues,
  type SpendingPlanPurposeFormValue,
  type SpendingPlanValidationErrors,
} from "../lib/spendingPlan";

interface MutationResult {
  success: boolean;
  validationErrors: SpendingPlanValidationErrors;
}

interface SpendingPlanEditorProps {
  initialValues: SpendingPlanFormValues;
  isSaving: boolean;
  submitLabel: string;
  effectiveDate?: string;
  effectiveEndDate?: string;
  onSubmit: (values: SpendingPlanFormValues) => Promise<MutationResult>;
  onCancel: () => void;
}

const distributionOptions: Array<{
  value: SpendingPlanDistributionType;
  label: string;
}> = [
  { value: "equal_daily", label: "แบ่งเท่ากันทุกวัน" },
  { value: "weekdays", label: "กำหนดเฉพาะวันทำงาน (จันทร์-ศุกร์)" },
  { value: "weekly", label: "ซ้ำทุกสัปดาห์" },
  { value: "biweekly", label: "ซ้ำทุก 2 สัปดาห์" },
  { value: "specific_dates", label: "เลือกวันเจาะจง" },
];

const weekdayOptions = [
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
  { value: 7, label: "อาทิตย์" },
];

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function toPickerDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function PurposeCard({
  purpose,
  values,
  dates,
  windowStart,
  windowEnd,
  isRevision,
  isSaving,
  isLoadingCategories,
  allCategories,
  visibleCategories,
  categorySearch,
  onCategorySearchChange,
  onUpdate,
  onToggleCategory,
  onRemove,
}: {
  purpose: SpendingPlanPurposeFormValue;
  values: SpendingPlanFormValues;
  dates: string[];
  windowStart: string;
  windowEnd: string;
  isRevision: boolean;
  isSaving: boolean;
  isLoadingCategories: boolean;
  allCategories: Array<{ id: string; name: string; color: string | null }>;
  visibleCategories: Array<{ id: string; name: string; color: string | null }>;
  categorySearch: string;
  onCategorySearchChange: (value: string) => void;
  onUpdate: (
    updater: (purpose: SpendingPlanPurposeFormValue) => SpendingPlanPurposeFormValue,
  ) => void;
  onToggleCategory: (categoryId: string, checked: boolean) => void;
  onRemove: () => void;
}) {
  const preview = getDistributionPreview(
    purpose,
    values.start_date,
    windowStart,
    windowEnd,
  );
  const isWeekly =
    purpose.distribution.type === "weekly" ||
    purpose.distribution.type === "biweekly";
  const isSpecificDates = purpose.distribution.type === "specific_dates";
  const selectedCategories = allCategories.filter((category) =>
    purpose.category_ids.includes(category.id),
  );

  return (
    <article
      data-testid="spending-plan-purpose-card"
      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            ชื่อวัตถุประสงค์
            <input
              data-testid="spending-plan-purpose-name"
              value={purpose.name}
              onChange={(event) =>
                onUpdate((item) => ({ ...item, name: event.target.value }))
              }
              placeholder="เช่น ค่าอาหาร"
              disabled={isSaving}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            วงเงินต่อครั้ง
            <input
              type="number"
              data-testid="spending-plan-purpose-amount"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={purpose.target_amount}
              onChange={(event) =>
                onUpdate((item) => ({ ...item, target_amount: event.target.value }))
              }
              disabled={isSaving}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-normal text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={isSaving || values.purposes.length === 1}
          onClick={onRemove}
          aria-label={`ลบ ${purpose.name || "วัตถุประสงค์"}`}
          title="ลบวัตถุประสงค์"
          className="shrink-0 rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            หมวดหมู่รายจ่าย
          </p>
          <div
            role="group"
            aria-label="หมวดหมู่ที่เลือก"
            className="mt-2 flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <Search
              className="h-3.5 w-3.5 shrink-0 text-slate-400"
              aria-hidden
            />
            {selectedCategories.map((category) => (
              <span
                key={category.id}
                className="inline-flex max-w-full items-center gap-1 rounded-lg bg-violet-50 px-1.5 py-1 text-xs text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color ?? "#94a3b8" }}
                  aria-hidden
                />
                <span className="max-w-40 truncate">{category.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleCategory(category.id, false)}
                  disabled={isSaving}
                  aria-label={`นำหมวดหมู่ ${category.name} ออก`}
                  title={`นำหมวดหมู่ ${category.name} ออก`}
                  className="shrink-0 p-0.5 text-violet-600 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-900/60"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
            <input
              value={categorySearch}
              onChange={(event) => onCategorySearchChange(event.target.value)}
              placeholder="ค้นหาหมวดหมู่"
              aria-label="ค้นหาหมวดหมู่รายจ่าย"
              disabled={isSaving}
              className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent p-0 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100"
            />
          </div>
          <div
            data-testid="spending-plan-category-options"
            className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800"
          >
            {visibleCategories.map((category) => {
              const selectedElsewhere = values.purposes.some(
                (item) =>
                  item.id !== purpose.id && item.category_ids.includes(category.id),
              );
              return (
                <label
                  key={category.id}
                  className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    data-testid="spending-plan-category-checkbox"
                    checked={purpose.category_ids.includes(category.id)}
                    disabled={isSaving || selectedElsewhere}
                    onChange={(event) =>
                      onToggleCategory(category.id, event.target.checked)
                    }
                    className="h-3.5 w-3.5 accent-violet-600"
                  />
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: category.color ?? "#94a3b8" }}
                  />
                  <span className="truncate">{category.name}</span>
                </label>
              );
            })}
            {isLoadingCategories && (
              <p className="px-2 py-2 text-xs text-slate-500">
                กำลังโหลดหมวดหมู่...
              </p>
            )}
            {!isLoadingCategories && visibleCategories.length === 0 && (
              <p className="px-2 py-2 text-xs text-slate-500">
                ไม่พบหมวดหมู่
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            รูปแบบการกระจายเงิน
            <select
              data-testid="spending-plan-distribution-select"
              value={purpose.distribution.type ?? ""}
              onChange={(event) =>
                onUpdate((item) => ({
                  ...item,
                  distribution: {
                    type: (event.target.value || null) as SpendingPlanDistributionType | null,
                    weekdays:
                      event.target.value === "weekly" ||
                      event.target.value === "biweekly"
                        ? item.distribution.weekdays
                        : [],
                    dates: event.target.value === "specific_dates" ? item.distribution.dates : [],
                  },
                }))
              }
              disabled={isSaving}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">เลือกรูปแบบการกระจาย</option>
              {distributionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {isWeekly && (
            <fieldset className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                เลือกวันที่ต้องการทำซ้ำ
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {weekdayOptions.map((day) => {
                  const checked = purpose.distribution.weekdays.includes(day.value);
                  return (
                    <label
                      key={day.value}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        data-testid="spending-plan-weekday-checkbox"
                        checked={checked}
                        onChange={(event) =>
                          onUpdate((item) => ({
                            ...item,
                            distribution: {
                              ...item.distribution,
                              weekdays: event.target.checked
                                ? [...item.distribution.weekdays, day.value].sort()
                                : item.distribution.weekdays.filter(
                                    (value) => value !== day.value,
                                  ),
                            },
                          }))
                        }
                        disabled={isSaving}
                        className="h-3.5 w-3.5 accent-violet-600"
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
              {purpose.distribution.type === "biweekly" && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  นับรอบละ 7 วัน โดยยึดวันเริ่มต้นของแผนเป็นจุดเริ่มต้น
                </p>
              )}
            </fieldset>
          )}

          {isSpecificDates && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 p-2 dark:border-slate-700">
              <p className="px-2 pt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                เลือกวันที่ในช่วง {formatShortDate(windowStart)} - {formatShortDate(windowEnd)}
              </p>
              <DayPicker
                data-testid="spending-plan-specific-date-picker"
                mode="multiple"
                selected={purpose.distribution.dates.map(toPickerDate)}
                onSelect={(selected) =>
                  onUpdate((item) => ({
                    ...item,
                    distribution: {
                      ...item.distribution,
                      dates: (selected ?? []).map(toDateValue).sort(),
                    },
                  }))
                }
                disabled={{
                  before: toPickerDate(windowStart),
                  after: toPickerDate(windowEnd),
                }}
                defaultMonth={toPickerDate(windowStart)}
                className="mx-auto"
              />
            </div>
          )}

          {purpose.distribution.type === null && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              แผนนี้เป็นรูปแบบเดิม กรุณาเลือกรูปแบบใหม่ก่อนบันทึก Revision
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400">
          เลือก {preview.dayCount} ครั้ง · {formatCurrency(preview.amountPerOccurrence)} / ครั้ง
        </p>
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          รวม {formatCurrency(preview.total)}
        </p>
      </div>
      {isRevision && purpose.distribution.type === "specific_dates" && dates.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          วันที่นอกช่วง Revision จะยังคงใช้ค่าจาก Revision เดิม
        </p>
      )}
    </article>
  );
}

export default function SpendingPlanEditor({
  initialValues,
  isSaving,
  submitLabel,
  effectiveDate,
  effectiveEndDate,
  onSubmit,
  onCancel,
}: SpendingPlanEditorProps) {
  const { wallets, isLoading: isLoadingWallets } = useWallet();
  const { categories, isLoading: isLoadingCategories } = useCategory({
    type: "expense",
  });
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<SpendingPlanValidationErrors>({});
  const [walletSearch, setWalletSearch] = useState("");
  const [categorySearches, setCategorySearches] = useState<Record<string, string>>({});
  const dates = useMemo(
    () => getPlanDates(values.start_date, values.end_date),
    [values.end_date, values.start_date],
  );
  const windowStart = effectiveDate ?? values.start_date;
  const windowEnd = effectiveEndDate ?? values.end_date;
  const transactionWallets = useMemo(
    () =>
      getTransactionWalletOptions(
        wallets.filter((wallet) => wallet.wallet_type === "normal"),
      ),
    [wallets],
  );
  const visibleWallets = useMemo(() => {
    const search = walletSearch.trim().toLocaleLowerCase();
    return search
      ? transactionWallets.filter((wallet) =>
          wallet.label.toLocaleLowerCase().includes(search),
        )
      : transactionWallets;
  }, [transactionWallets, walletSearch]);
  const selectedWallets = values.wallet_ids
    .map((walletId) => transactionWallets.find((wallet) => wallet.id === walletId))
    .filter((wallet): wallet is (typeof transactionWallets)[number] => Boolean(wallet));
  const getVisibleCategories = (categorySearch: string) => {
    const search = categorySearch.trim().toLocaleLowerCase();
    return search
      ? categories.filter((category) =>
          category.name.toLocaleLowerCase().includes(search),
        )
      : categories;
  };
  const planTotal = getProjectedPlanTotal(values, windowStart, windowEnd);
  const isRevision = Boolean(effectiveDate);

  const update = (next: SpendingPlanFormValues) => {
    setValues(next);
    setErrors({});
  };

  const updateDates = (key: "start_date" | "end_date", value: string) => {
    update({ ...values, [key]: value });
  };

  const toggleWallet = (walletId: string, checked: boolean) => {
    update({
      ...values,
      wallet_ids: checked
        ? [...values.wallet_ids, walletId]
        : values.wallet_ids.filter((id) => id !== walletId),
    });
  };

  const updatePurpose = (
    purposeId: string,
    updater: (
      purpose: SpendingPlanPurposeFormValue,
    ) => SpendingPlanPurposeFormValue,
  ) => {
    update({
      ...values,
      purposes: values.purposes.map((purpose) =>
        purpose.id === purposeId ? updater(purpose) : purpose,
      ),
    });
  };

  const updateCategorySearch = (purposeId: string, value: string) => {
    setCategorySearches((current) => ({ ...current, [purposeId]: value }));
  };

  const removePurpose = (purposeId: string) => {
    update({
      ...values,
      purposes: values.purposes.filter((purpose) => purpose.id !== purposeId),
    });
    setCategorySearches((current) => {
      const next = { ...current };
      delete next[purposeId];
      return next;
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await onSubmit(values);
    setErrors(result.validationErrors);
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="ชื่อแผน"
            value={values.name}
            onChange={(event) => update({ ...values, name: event.target.value })}
            error={errors.name}
            placeholder="เช่น แผนใช้เงินเที่ยวเชียงใหม่"
            disabled={isSaving}
          />
          <FormField
            label="วันเริ่มต้น"
            type="date"
            value={values.start_date}
            onChange={(event) => updateDates("start_date", event.target.value)}
            error={errors.dates}
            disabled={isSaving || isRevision}
          />
          <FormField
            label="วันสิ้นสุด"
            type="date"
            min={values.start_date}
            value={values.end_date}
            onChange={(event) => updateDates("end_date", event.target.value)}
            error={errors.dates}
            disabled={isSaving || isRevision}
          />
        </div>
        {effectiveDate && (
          <p className="mt-4 border-l-2 border-violet-500 pl-3 text-sm text-slate-600 dark:text-slate-300">
            การแก้ไขนี้มีผลตั้งแต่ {formatShortDate(effectiveDate)} ถึง {formatShortDate(effectiveEndDate ?? values.end_date)} ข้อมูลนอกช่วงยังคงเป็น Revision เดิม
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              กระเป๋าที่ติดตาม
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              เลือกกระเป๋าที่จะนำรายจ่ายมาคิดในแผนนี้
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            เลือกแล้ว {values.wallet_ids.length} ใบ
          </span>
        </div>
        <div
          role="group"
          aria-label="กระเป๋าที่เลือก"
          className="mt-4 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800"
        >
          <Search
            className="h-4 w-4 shrink-0 text-slate-400"
            aria-hidden
          />
          {selectedWallets.map((wallet) => (
            <span
              key={wallet.id}
              className="inline-flex max-w-full items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"
            >
              <span className="max-w-56 truncate">{wallet.label}</span>
              <button
                type="button"
                onClick={() => toggleWallet(wallet.id, false)}
                disabled={isSaving}
                aria-label={`นำกระเป๋า ${wallet.label} ออก`}
                title={`นำกระเป๋า ${wallet.label} ออก`}
                className="shrink-0 p-0.5 text-violet-600 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-900/60"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
          <input
            value={walletSearch}
            onChange={(event) => setWalletSearch(event.target.value)}
            placeholder="ค้นหากระเป๋า"
            aria-label="ค้นหากระเป๋าที่ติดตาม"
            disabled={isSaving || isLoadingWallets}
            className="h-7 min-w-[10rem] flex-1 border-0 bg-transparent p-0 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100"
          />
        </div>
        <div
          data-testid="spending-plan-wallet-options"
          className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700"
        >
          {visibleWallets.map((wallet) => (
            <label
              key={wallet.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                data-testid="spending-plan-wallet-checkbox"
                checked={values.wallet_ids.includes(wallet.id)}
                onChange={(event) => toggleWallet(wallet.id, event.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 accent-violet-600"
              />
              <span className="min-w-0 truncate">{wallet.label}</span>
            </label>
          ))}
          {!isLoadingWallets && visibleWallets.length === 0 && (
            <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
              ไม่มีกระเป๋าที่ใช้บันทึกรายการได้
            </p>
          )}
        </div>
        {errors.wallets && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {errors.wallets}
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              รูปแบบการกระจายเงิน
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              กรอกยอดของแต่ละวัตถุประสงค์ แล้วเลือกรูปแบบวันที่ให้ระบบคำนวณเอง
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isSaving || values.purposes.length >= 10}
            onClick={() =>
              update({
                ...values,
                purposes: [
                  ...values.purposes,
                  createPurpose(values.purposes.length + 1),
                ],
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            เพิ่มวัตถุประสงค์
          </Button>
        </header>

        <div className="mt-5 space-y-4">
          {values.purposes.map((purpose) => {
            const categorySearch = categorySearches[purpose.id] ?? "";

            return (
              <PurposeCard
                key={purpose.id}
                purpose={purpose}
                values={values}
                dates={dates}
                windowStart={windowStart}
                windowEnd={windowEnd}
                isRevision={isRevision}
                isSaving={isSaving}
                isLoadingCategories={isLoadingCategories}
                allCategories={categories}
                visibleCategories={getVisibleCategories(categorySearch)}
                categorySearch={categorySearch}
                onCategorySearchChange={(value) =>
                  updateCategorySearch(purpose.id, value)
                }
                onUpdate={(updater) => updatePurpose(purpose.id, updater)}
                onToggleCategory={(categoryId, checked) =>
                  updatePurpose(purpose.id, (item) => ({
                    ...item,
                    category_ids: checked
                      ? [...item.category_ids, categoryId]
                      : item.category_ids.filter((id) => id !== categoryId),
                  }))
                }
                onRemove={() => removePurpose(purpose.id)}
              />
            );
          })}
        </div>

        <footer className="mt-5 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 pt-5 dark:border-slate-800 dark:bg-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {isRevision
                ? `ยอดรวม Revision นี้ ${formatCurrency(planTotal)} จะคำนวณใหม่ตามช่วงที่มีผล`
                : `ยอดรวมแผน ${formatCurrency(planTotal)} จากวงเงินต่อครั้ง`}
            </p>
            {errors.purposes && (
              <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.purposes}
              </p>
            )}
            {errors.distributions && (
              <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.distributions}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" disabled={isSaving} onClick={onCancel}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSaving || dates.length === 0}>
              {isSaving ? "กำลังบันทึก" : submitLabel}
            </Button>
          </div>
        </footer>
      </Card>
    </form>
  );
}
