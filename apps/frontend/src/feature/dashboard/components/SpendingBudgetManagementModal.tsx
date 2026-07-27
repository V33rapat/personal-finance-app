"use client";

import { useMemo, useState } from "react";
import { Pencil, Pause, Play, Plus, Search, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import FormField from "@/components/ui/FormField";
import { TH_TEXT } from "@/constants/th";
import { useCategory } from "@/feature/transaction/hooks/useCategory";
import { getTransactionWalletOptions } from "@/feature/transaction/lib/transactionWallet";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import type {
  SpendingBudget,
  SpendingBudgetCategory,
} from "../hooks/useSpendingBudget";
import type {
  SpendingBudgetFormValues,
  SpendingBudgetPeriod,
  SpendingBudgetValidationErrors,
} from "../lib/spendingBudget";

type ModalMode = "list" | "create" | "edit";

interface MutationResult {
  success: boolean;
  validationErrors: SpendingBudgetValidationErrors;
}

interface SpendingBudgetManagementModalProps {
  isOpen: boolean;
  budgets: SpendingBudget[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  wallets: Wallet[];
  isLoadingWallets: boolean;
  onClose: () => void;
  onCreate: (values: SpendingBudgetFormValues) => Promise<MutationResult>;
  onUpdate: (id: string, values: SpendingBudgetFormValues) => Promise<MutationResult>;
  onSetActive: (budget: SpendingBudget, isActive: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const emptyFormValues: SpendingBudgetFormValues = {
  name: "",
  amount: "",
  period: "daily",
  category_ids: [],
  includes_uncategorized: false,
  wallet_scope: "all",
  wallet_ids: [],
};

function toFormValues(budget: SpendingBudget): SpendingBudgetFormValues {
  return {
    name: budget.name,
    amount: budget.amount,
    period: budget.period,
    category_ids: budget.categories.map((category) => category.id),
    includes_uncategorized: budget.includes_uncategorized,
    wallet_scope: budget.wallet_scope,
    wallet_ids: budget.wallets.map((wallet) => wallet.id),
  };
}

function periodLabel(period: SpendingBudgetPeriod) {
  return TH_TEXT.budget[period];
}

function getWalletScopeLabel(budget: SpendingBudget) {
  if (budget.wallet_scope === "all") {
    return TH_TEXT.budget.allWallets;
  }

  const firstWallet = budget.wallets[0];

  if (!firstWallet) {
    return TH_TEXT.budget.selectedWallets;
  }

  const firstWalletLabel = firstWallet.parent_name
    ? `${firstWallet.parent_name}: ${firstWallet.name}`
    : firstWallet.name;

  return budget.wallets.length === 1
    ? firstWalletLabel
    : `${firstWalletLabel} +${budget.wallets.length - 1}`;
}

function CategoryCheckbox({
  category,
  checked,
  disabled,
  onChange,
}: {
  category: SpendingBudgetCategory;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-violet-600"
      />
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: category.color ?? "#94A3B8" }}
        aria-hidden
      />
      <span className="min-w-0 truncate">{category.name}</span>
    </label>
  );
}

function WalletCheckbox({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70">
      <input
        id={`spending-budget-wallet-${id}`}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-violet-600"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

export default function SpendingBudgetManagementModal({
  isOpen,
  budgets,
  isLoading,
  isSaving,
  error,
  wallets,
  isLoadingWallets,
  onClose,
  onCreate,
  onUpdate,
  onSetActive,
  onDelete,
}: SpendingBudgetManagementModalProps) {
  const { categories, isLoading: isLoadingCategories } = useCategory({
    type: "expense",
    autoLoad: isOpen,
  });
  const [mode, setMode] = useState<ModalMode>("list");
  const [editingBudget, setEditingBudget] = useState<SpendingBudget | null>(null);
  const [formValues, setFormValues] = useState<SpendingBudgetFormValues>(emptyFormValues);
  const [validationErrors, setValidationErrors] = useState<SpendingBudgetValidationErrors>({});
  const [categorySearch, setCategorySearch] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [deletingBudget, setDeletingBudget] = useState<SpendingBudget | null>(null);

  const visibleCategories = useMemo(() => {
    const search = categorySearch.trim().toLocaleLowerCase();

    if (!search) {
      return categories;
    }

    return categories.filter((category) => category.name.toLocaleLowerCase().includes(search));
  }, [categories, categorySearch]);

  const availableWalletOptions = useMemo(
    () =>
      getTransactionWalletOptions(
        wallets.filter((wallet) => wallet.wallet_type === "normal"),
      ),
    [wallets],
  );

  const visibleWalletOptions = useMemo(() => {
    const search = walletSearch.trim().toLocaleLowerCase();

    if (!search) {
      return availableWalletOptions;
    }

    return availableWalletOptions.filter((wallet) =>
      wallet.label.toLocaleLowerCase().includes(search),
    );
  }, [availableWalletOptions, walletSearch]);

  const unavailableWallets = useMemo(
    () =>
      editingBudget?.wallet_scope === "selected"
        ? editingBudget.wallets.filter((wallet) => !wallet.is_available)
        : [],
    [editingBudget],
  );

  if (!isOpen) {
    return null;
  }

  const close = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditingBudget(null);
    setFormValues(emptyFormValues);
    setValidationErrors({});
    setCategorySearch("");
    setWalletSearch("");
  };

  const openEdit = (budget: SpendingBudget) => {
    setMode("edit");
    setEditingBudget(budget);
    setFormValues(toFormValues(budget));
    setValidationErrors({});
    setCategorySearch("");
    setWalletSearch("");
  };

  const returnToList = () => {
    setMode("list");
    setEditingBudget(null);
    setValidationErrors({});
    setCategorySearch("");
    setWalletSearch("");
  };

  const updateFormValue = <Key extends keyof SpendingBudgetFormValues>(
    key: Key,
    value: SpendingBudgetFormValues[Key]
  ) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    const errorKey =
      key === "category_ids"
        ? "categories"
        : key === "wallet_ids" || key === "wallet_scope"
          ? "wallets"
          : key;
    setValidationErrors((current) => ({ ...current, [errorKey]: undefined }));
  };

  const toggleCategory = (categoryId: string, checked: boolean) => {
    updateFormValue(
      "category_ids",
      checked
        ? [...formValues.category_ids, categoryId]
        : formValues.category_ids.filter((selectedCategoryId) => selectedCategoryId !== categoryId)
    );
  };

  const setWalletScope = (walletScope: SpendingBudgetFormValues["wallet_scope"]) => {
    setFormValues((current) => ({
      ...current,
      wallet_scope: walletScope,
      wallet_ids: walletScope === "all" ? [] : current.wallet_ids,
    }));
    setValidationErrors((current) => ({ ...current, wallets: undefined }));
  };

  const toggleWallet = (walletId: string, checked: boolean) => {
    updateFormValue(
      "wallet_ids",
      checked
        ? [...formValues.wallet_ids, walletId]
        : formValues.wallet_ids.filter(
            (selectedWalletId) => selectedWalletId !== walletId,
          ),
    );
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result =
      mode === "create"
        ? await onCreate(formValues)
        : editingBudget
          ? await onUpdate(editingBudget.id, formValues)
          : { success: false, validationErrors: {} };

    if (result.success) {
      returnToList();
      return;
    }

    setValidationErrors(result.validationErrors);
  };

  const confirmDelete = async () => {
    if (!deletingBudget) {
      return;
    }

    const deleted = await onDelete(deletingBudget.id);

    if (deleted) {
      setDeletingBudget(null);
    }
  };

  const isFormMode = mode === "create" || mode === "edit";

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
          onClick={close}
          aria-label={TH_TEXT.common.close}
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="spending-budget-modal-title"
          className="relative flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
            <div>
              <h2 id="spending-budget-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {isFormMode
                  ? mode === "create"
                    ? TH_TEXT.budget.create
                    : TH_TEXT.budget.edit
                  : TH_TEXT.budget.manage}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {TH_TEXT.budget.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={TH_TEXT.common.close}
              title={TH_TEXT.common.close}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>

          {error && (
            <div role="alert" className="mx-5 mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {isFormMode ? (
            <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label={TH_TEXT.budget.budgetName}
                  value={formValues.name}
                  onChange={(event) => updateFormValue("name", event.target.value)}
                  placeholder={TH_TEXT.budget.budgetNamePlaceholder}
                  error={validationErrors.name}
                  disabled={isSaving}
                  maxLength={100}
                />
                <FormField
                  label={TH_TEXT.budget.amount}
                  value={formValues.amount}
                  onChange={(event) => updateFormValue("amount", event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  error={validationErrors.amount}
                  disabled={isSaving}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="spending-budget-period" className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {TH_TEXT.budget.period}
                </label>
                <select
                  id="spending-budget-period"
                  value={formValues.period}
                  onChange={(event) => updateFormValue("period", event.target.value as SpendingBudgetPeriod)}
                  disabled={isSaving}
                  className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                >
                  {(["daily", "weekly", "monthly", "yearly"] as SpendingBudgetPeriod[]).map((period) => (
                    <option key={period} value={period}>
                      {periodLabel(period)}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="mt-5">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {TH_TEXT.budget.walletScope}
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-3 text-sm text-slate-700 transition has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 dark:border-slate-700 dark:text-slate-200 dark:has-[:checked]:border-violet-500 dark:has-[:checked]:bg-violet-950/20">
                    <input
                      type="radio"
                      name="spending-budget-wallet-scope"
                      checked={formValues.wallet_scope === "all"}
                      disabled={isSaving}
                      onChange={() => setWalletScope("all")}
                      className="mt-0.5 h-4 w-4 accent-violet-600"
                    />
                    <span className="font-semibold">{TH_TEXT.budget.allWallets}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-3 text-sm text-slate-700 transition has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 dark:border-slate-700 dark:text-slate-200 dark:has-[:checked]:border-violet-500 dark:has-[:checked]:bg-violet-950/20">
                    <input
                      type="radio"
                      name="spending-budget-wallet-scope"
                      checked={formValues.wallet_scope === "selected"}
                      disabled={isSaving}
                      onChange={() => setWalletScope("selected")}
                      className="mt-0.5 h-4 w-4 accent-violet-600"
                    />
                    <span className="font-semibold">{TH_TEXT.budget.selectedWallets}</span>
                  </label>
                </div>

                {formValues.wallet_scope === "selected" && (
                  <>
                    <div className="relative mt-3">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                      <input
                        value={walletSearch}
                        onChange={(event) => setWalletSearch(event.target.value)}
                        placeholder={TH_TEXT.budget.walletSearch}
                        disabled={isSaving || isLoadingWallets}
                        className="h-11 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                      />
                    </div>

                    <div className="mt-2 max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700">
                      {isLoadingWallets ? (
                        <p className="p-3 text-sm text-slate-500 dark:text-slate-400">กำลังโหลดกระเป๋า...</p>
                      ) : visibleWalletOptions.length === 0 ? (
                        <p className="p-3 text-sm text-slate-500 dark:text-slate-400">{TH_TEXT.budget.noEligibleWallets}</p>
                      ) : (
                        visibleWalletOptions.map((wallet) => (
                          <WalletCheckbox
                            key={wallet.id}
                            id={wallet.id}
                            label={wallet.label}
                            checked={formValues.wallet_ids.includes(wallet.id)}
                            disabled={isSaving}
                            onChange={(checked) => toggleWallet(wallet.id, checked)}
                          />
                        ))
                      )}
                    </div>

                    {unavailableWallets.length > 0 && (
                      <div className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                        <p className="font-semibold">{TH_TEXT.budget.unavailableWallets}</p>
                        <ul className="mt-2 space-y-1">
                          {unavailableWallets.map((wallet) => (
                            <li key={wallet.id} className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate">
                                {wallet.parent_name ? `${wallet.parent_name}: ${wallet.name}` : wallet.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleWallet(wallet.id, false)}
                                disabled={isSaving}
                                aria-label={`${TH_TEXT.budget.removeWallet}: ${wallet.name}`}
                                title={TH_TEXT.budget.removeWallet}
                                className="shrink-0 rounded p-1 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-amber-900/50"
                              >
                                <X className="h-4 w-4" aria-hidden />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {validationErrors.wallets && (
                  <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {validationErrors.wallets}
                  </p>
                )}
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {TH_TEXT.budget.categories}
                </legend>
                <label className="mt-3 flex cursor-pointer items-start gap-3 border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formValues.includes_uncategorized}
                    disabled={isSaving}
                    onChange={(event) => updateFormValue("includes_uncategorized", event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-violet-600"
                  />
                  <span>
                    <span className="block font-semibold">{TH_TEXT.budget.uncategorized}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      {TH_TEXT.budget.uncategorizedHint}
                    </span>
                  </span>
                </label>

                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder={TH_TEXT.budget.categorySearch}
                    disabled={isSaving}
                    className="h-11 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                  />
                </div>

                <div className="mt-2 max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700">
                  {isLoadingCategories ? (
                    <p className="p-3 text-sm text-slate-500 dark:text-slate-400">กำลังโหลดหมวดหมู่...</p>
                  ) : visibleCategories.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500 dark:text-slate-400">ไม่พบหมวดหมู่</p>
                  ) : (
                    visibleCategories.map((category) => (
                      <CategoryCheckbox
                        key={category.id}
                        category={category}
                        checked={formValues.category_ids.includes(category.id)}
                        disabled={isSaving}
                        onChange={(checked) => toggleCategory(category.id, checked)}
                      />
                    ))
                  )}
                </div>
                {validationErrors.categories && (
                  <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {validationErrors.categories}
                  </p>
                )}
              </fieldset>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={returnToList} disabled={isSaving}>
                  {TH_TEXT.budget.cancel}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {mode === "create" ? TH_TEXT.budget.save : TH_TEXT.budget.saveChanges}
                </Button>
              </div>
            </form>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="flex justify-end">
                <Button size="sm" onClick={openCreate} disabled={isSaving}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {TH_TEXT.budget.create}
                </Button>
              </div>

              {isLoading ? (
                <div className="mt-5 space-y-3">
                  <div className="h-20 animate-pulse bg-slate-100 dark:bg-slate-800" />
                  <div className="h-20 animate-pulse bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : budgets.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {TH_TEXT.budget.noManagedBudgets}
                </p>
              ) : (
                <ul className="mt-5 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {budgets.map((budget) => (
                    <li key={budget.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-50">{budget.name}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {periodLabel(budget.period)} · ฿{budget.amount}
                          {budget.is_active ? "" : " · พักไว้"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {getWalletScopeLabel(budget)}
                        </p>
                        {budget.unavailable_wallet_count > 0 && (
                          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                            {TH_TEXT.budget.unavailableWalletsCount.replace(
                              "%s",
                              String(budget.unavailable_wallet_count),
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void onSetActive(budget, !budget.is_active)}
                          disabled={isSaving}
                          aria-label={budget.is_active ? TH_TEXT.budget.pause : TH_TEXT.budget.resume}
                          title={budget.is_active ? TH_TEXT.budget.pause : TH_TEXT.budget.resume}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          {budget.is_active ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(budget)}
                          disabled={isSaving}
                          aria-label={TH_TEXT.common.edit}
                          title={TH_TEXT.common.edit}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBudget(budget)}
                          disabled={isSaving}
                          aria-label={TH_TEXT.common.delete}
                          title={TH_TEXT.common.delete}
                          className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <ConfirmationDialog
        isOpen={deletingBudget !== null}
        title={TH_TEXT.budget.deleteConfirmTitle}
        message={TH_TEXT.budget.deleteConfirmMessage}
        confirmText={TH_TEXT.common.delete}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeletingBudget(null)}
        isLoading={isSaving}
      />
    </>
  );
}
