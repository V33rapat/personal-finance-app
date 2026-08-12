"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField from "@/components/ui/FormField";
import { useCategory } from "@/feature/transaction/hooks/useCategory";
import { getTransactionWalletOptions } from "@/feature/transaction/lib/transactionWallet";
import { useWallet } from "@/feature/wallet/hooks/useWallet";
import {
  createPurpose,
  getPlanDates,
  synchronizePlanAllocations,
  type SpendingPlanFormValues,
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

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
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
  const [values, setValues] = useState(() => synchronizePlanAllocations(initialValues));
  const [errors, setErrors] = useState<SpendingPlanValidationErrors>({});
  const [walletSearch, setWalletSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const dates = useMemo(
    () => getPlanDates(values.start_date, values.end_date),
    [values.end_date, values.start_date],
  );
  const transactionWallets = useMemo(
    () => getTransactionWalletOptions(wallets.filter((wallet) => wallet.wallet_type === "normal")),
    [wallets],
  );
  const visibleWallets = useMemo(() => {
    const search = walletSearch.trim().toLocaleLowerCase();
    return search
      ? transactionWallets.filter((wallet) => wallet.label.toLocaleLowerCase().includes(search))
      : transactionWallets;
  }, [transactionWallets, walletSearch]);
  const visibleCategories = useMemo(() => {
    const search = categorySearch.trim().toLocaleLowerCase();
    return search
      ? categories.filter((category) => category.name.toLocaleLowerCase().includes(search))
      : categories;
  }, [categories, categorySearch]);
  const allocationTotal = values.purposes.reduce(
    (total, purpose) =>
      total + purpose.allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0),
    0,
  );
  const planAmount = Number(values.amount || 0);
  const isRevision = Boolean(effectiveDate);

  const update = (next: SpendingPlanFormValues) => {
    setValues(next);
    setErrors({});
  };

  const updateDates = (key: "start_date" | "end_date", value: string) => {
    update(
      synchronizePlanAllocations({
        ...values,
        [key]: value,
      }),
    );
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
    updater: (purpose: SpendingPlanFormValues["purposes"][number]) => SpendingPlanFormValues["purposes"][number],
  ) => {
    update({
      ...values,
      purposes: values.purposes.map((purpose) =>
        purpose.id === purposeId ? updater(purpose) : purpose,
      ),
    });
  };

  const toggleCategory = (purposeId: string, categoryId: string, checked: boolean) => {
    updatePurpose(purposeId, (purpose) => ({
      ...purpose,
      category_ids: checked
        ? [...purpose.category_ids, categoryId]
        : purpose.category_ids.filter((id) => id !== categoryId),
    }));
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
            label="ยอดรวมที่วางแผน"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => update({ ...values, amount: event.target.value })}
            error={errors.amount}
            disabled={isSaving || isRevision}
          />
          <FormField
            label="วันเริ่มต้น"
            type="date"
            value={values.start_date}
            onChange={(event) => updateDates("start_date", event.target.value)}
            error={errors.dates}
            disabled={isSaving || Boolean(effectiveDate)}
          />
          <FormField
            label="วันสิ้นสุด"
            type="date"
            min={values.start_date}
            value={values.end_date}
            onChange={(event) => updateDates("end_date", event.target.value)}
            error={errors.dates}
            disabled={isSaving || Boolean(effectiveDate)}
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
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">กระเป๋าที่ติดตาม</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">เลือกกระเป๋าที่จะนำรายจ่ายมาคิดในแผนนี้</p>
          </div>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">เลือกแล้ว {values.wallet_ids.length} ใบ</span>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={walletSearch}
            onChange={(event) => setWalletSearch(event.target.value)}
            placeholder="ค้นหากระเป๋า"
            disabled={isSaving || isLoadingWallets}
            className="h-11 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div
          data-testid="spending-plan-wallet-options"
          className="mt-3 max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700"
        >
          {visibleWallets.map((wallet) => (
            <label key={wallet.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
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
            <p className="p-3 text-sm text-slate-500 dark:text-slate-400">ไม่มีกระเป๋าที่ใช้บันทึกรายการได้</p>
          )}
        </div>
        {errors.wallets && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.wallets}</p>}
      </Card>

      <Card className="overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">ตารางจัดสรรตามวัน</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">แต่ละช่องคือวงเงินของวัตถุประสงค์นั้นในวันนั้น</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={isSaving || values.purposes.length >= 10 || dates.length === 0}
            onClick={() => update({ ...values, purposes: [...values.purposes, createPurpose(dates, values.purposes.length + 1)] })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            เพิ่มวัตถุประสงค์
          </Button>
        </header>

        <div className="overflow-x-auto p-5 sm:p-6">
          <table className="min-w-[900px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="min-w-56 pb-3 pr-3">วัตถุประสงค์และหมวดหมู่</th>
                {dates.map((date) => <th key={date} className="min-w-24 px-1 pb-3 text-center">{formatShortDate(date)}</th>)}
                <th className="min-w-28 pb-3 pl-3 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {values.purposes.map((purpose) => {
                const purposeTotal = purpose.allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
                return (
                  <tr key={purpose.id} className="align-top border-b border-slate-100 dark:border-slate-800">
                    <td className="py-4 pr-3">
                      <div className="flex gap-2">
                        <input
                          data-testid="spending-plan-purpose-name"
                          value={purpose.name}
                          onChange={(event) => updatePurpose(purpose.id, (item) => ({ ...item, name: event.target.value }))}
                          placeholder="เช่น อาหาร"
                          disabled={isSaving}
                          className="min-w-0 flex-1 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          disabled={isSaving || values.purposes.length === 1}
                          onClick={() => update({ ...values, purposes: values.purposes.filter((item) => item.id !== purpose.id) })}
                          aria-label={`ลบ ${purpose.name || "วัตถุประสงค์"}`}
                          title="ลบวัตถุประสงค์"
                          className="shrink-0 p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <div className="relative mt-2">
                        <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
                        <input
                          value={categorySearch}
                          onChange={(event) => setCategorySearch(event.target.value)}
                          placeholder="ค้นหาหมวดหมู่"
                          className="h-9 w-full border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-800 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div
                        data-testid="spending-plan-category-options"
                        className="mt-1 max-h-28 overflow-y-auto border border-slate-100 dark:border-slate-800"
                      >
                        {visibleCategories.map((category) => {
                          const selectedElsewhere = values.purposes.some(
                            (item) => item.id !== purpose.id && item.category_ids.includes(category.id),
                          );
                          return (
                            <label key={category.id} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                              <input
                                type="checkbox"
                                data-testid="spending-plan-category-checkbox"
                                checked={purpose.category_ids.includes(category.id)}
                                disabled={isSaving || selectedElsewhere}
                                onChange={(event) => toggleCategory(purpose.id, category.id, event.target.checked)}
                                className="h-3.5 w-3.5 accent-violet-600"
                              />
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color ?? "#94a3b8" }} />
                              <span className="truncate">{category.name}</span>
                            </label>
                          );
                        })}
                        {isLoadingCategories && <p className="px-2 py-2 text-xs text-slate-500">กำลังโหลดหมวดหมู่...</p>}
                      </div>
                    </td>
                    {purpose.allocations.map((allocation) => (
                      <td key={allocation.date} className="px-1 py-4">
                        <input
                          type="number"
                          data-testid="spending-plan-allocation"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={allocation.amount}
                          onChange={(event) => updatePurpose(purpose.id, (item) => ({
                            ...item,
                            allocations: item.allocations.map((cell) =>
                              cell.date === allocation.date ? { ...cell, amount: event.target.value } : cell,
                            ),
                          }))}
                          disabled={isSaving || Boolean(effectiveDate && (allocation.date < effectiveDate || allocation.date > (effectiveEndDate ?? values.end_date)))}
                          aria-label={`${purpose.name || "วัตถุประสงค์"} ${allocation.date}`}
                          className="h-9 w-full border border-slate-200 bg-white px-2 text-right text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </td>
                    ))}
                    <td className="py-4 pl-3 text-right font-semibold text-slate-700 dark:text-slate-200">฿{purposeTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/20 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{isRevision ? `ยอดรวมทั้งแผน ฿${planAmount.toFixed(2)} จะคำนวณใหม่จาก Revision ตามวันเมื่อบันทึก` : `จัดสรรแล้ว ฿${allocationTotal.toFixed(2)} / ฿${planAmount.toFixed(2)}`}</p>
            {errors.purposes && <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.purposes}</p>}
            {errors.allocations && <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.allocations}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="secondary" disabled={isSaving} onClick={onCancel}>ยกเลิก</Button>
            <Button type="submit" disabled={isSaving || dates.length === 0}>
              {isSaving ? "กำลังบันทึก" : submitLabel}
            </Button>
          </div>
        </footer>
      </Card>
    </form>
  );
}
