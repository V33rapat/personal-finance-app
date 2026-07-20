"use client";

import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { TH_TEXT } from "@/constants/th";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import type { AllocationFormValues, MoneyAllocation } from "../hooks/useAllocation";
import {
  formatMoneyCents,
  getAllocationRemainingCents,
  getAllocationValidationErrors,
  getTodayDateString,
  toMoneyCents,
} from "../lib/allocationValidation";
import {
  formatWalletMoney,
  getAllocationWalletLabel,
  getEligibleAllocationWallets,
} from "../lib/allocationWallet";

interface AllocationFormProps {
  wallets: Wallet[];
  isSaving: boolean;
  error: string | null;
  mode: "create" | "edit";
  initialValues?: AllocationFormValues;
  editingAllocation?: MoneyAllocation | null;
  onCancelEdit?: () => void;
  onSubmit: (values: AllocationFormValues) => void;
}

const selectClassName = [
  "h-[46px] w-full rounded-xl border border-slate-200 bg-white/60 px-4 text-sm font-medium text-slate-800",
  "outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20",
  "dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-500/20",
].join(" ");

const labelClassName =
  "text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400";

function getInitialValues(): AllocationFormValues {
  return {
    source_wallet_id: "",
    amount: "",
    allocation_date: getTodayDateString(),
    note: "",
    destinations: [{ wallet_id: "", amount: "" }],
  };
}

export default function AllocationForm({
  wallets,
  isSaving,
  error,
  mode,
  initialValues,
  editingAllocation,
  onCancelEdit,
  onSubmit,
}: AllocationFormProps) {
  const [values, setValues] = useState<AllocationFormValues>(
    initialValues ?? getInitialValues()
  );
  const [submitted, setSubmitted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const eligibleWallets = useMemo(() => getEligibleAllocationWallets(wallets), [wallets]);
  const fieldErrors = useMemo(
    () => getAllocationValidationErrors(values, wallets, editingAllocation),
    [editingAllocation, values, wallets]
  );
  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const showValidationErrors = submitted || hasInteracted;
  const destinationErrors = [
    fieldErrors.destinationWallet,
    fieldErrors.destinationAmount,
    fieldErrors.remaining,
  ].filter((message): message is string => Boolean(message));
  const remainingCents = getAllocationRemainingCents(values);
  const allocatedCents = values.destinations.reduce(
    (total, destination) => total + (toMoneyCents(destination.amount) || 0),
    0
  );
  const isEditMode = mode === "edit";

  const updateValue = <Key extends keyof AllocationFormValues>(
    key: Key,
    value: AllocationFormValues[Key]
  ) => {
    setHasInteracted(true);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateDestination = (
    index: number,
    key: keyof AllocationFormValues["destinations"][number],
    value: string
  ) => {
    setHasInteracted(true);
    setValues((current) => ({
      ...current,
      destinations: current.destinations.map((destination, destinationIndex) =>
        destinationIndex === index ? { ...destination, [key]: value } : destination
      ),
    }));
  };

  const addDestination = () => {
    setHasInteracted(true);
    setValues((current) => ({
      ...current,
      destinations: [...current.destinations, { wallet_id: "", amount: "" }],
    }));
  };

  const removeDestination = (index: number) => {
    setHasInteracted(true);
    setValues((current) => ({
      ...current,
      destinations: current.destinations.filter((_, destinationIndex) => destinationIndex !== index),
    }));
  };

  const getDestinationWallets = (index: number) => {
    const selectedOtherWalletIds = new Set(
      values.destinations
        .filter((_, destinationIndex) => destinationIndex !== index)
        .map((destination) => destination.wallet_id)
        .filter(Boolean)
    );
    const selectedWalletId = values.destinations[index]?.wallet_id;

    return eligibleWallets.filter(
      (wallet) =>
        wallet.id !== values.source_wallet_id &&
        (!selectedOtherWalletIds.has(wallet.id) || wallet.id === selectedWalletId)
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasFieldErrors || isSaving) {
      return;
    }

    onSubmit(values);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isEditMode ? TH_TEXT.allocation.editTitle : TH_TEXT.allocation.formTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {isEditMode ? TH_TEXT.allocation.editDescription : TH_TEXT.allocation.formDescription}
          </p>
        </div>
        {isEditMode && onCancelEdit && (
          <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={onCancelEdit}>
            {TH_TEXT.allocation.cancelEdit}
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border-b border-slate-200 pb-6 dark:border-slate-800 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <p className={labelClassName}>{TH_TEXT.allocation.sourcePanel}</p>
          <div className="mt-4 grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="allocation-source-wallet" className={labelClassName}>
                {TH_TEXT.allocation.sourceWallet}
              </label>
              <select
                id="allocation-source-wallet"
                value={values.source_wallet_id}
                onChange={(event) => updateValue("source_wallet_id", event.target.value)}
                disabled={isSaving}
                aria-invalid={showValidationErrors && !!fieldErrors.sourceWallet}
                aria-describedby={
                  showValidationErrors && fieldErrors.sourceWallet
                    ? "allocation-source-wallet-error"
                    : undefined
                }
                className={[
                  selectClassName,
                  showValidationErrors && fieldErrors.sourceWallet
                    ? "border-red-400 ring-2 ring-red-400/20 dark:border-red-500 dark:ring-red-500/20"
                    : "",
                ].join(" ")}
              >
                <option value="">{TH_TEXT.allocation.selectSourceWallet}</option>
                {eligibleWallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {getAllocationWalletLabel(wallet, wallets)} ({formatWalletMoney(wallet.balance, wallet.currency)})
                  </option>
                ))}
              </select>
              {showValidationErrors && fieldErrors.sourceWallet && (
                <p
                  id="allocation-source-wallet-error"
                  role="alert"
                  className="text-xs text-red-500 dark:text-red-400"
                >
                  {fieldErrors.sourceWallet}
                </p>
              )}
            </div>

            <FormField
              id="allocation-amount"
              label={TH_TEXT.allocation.amount}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values.amount}
              placeholder={TH_TEXT.transaction.amountPlaceholder}
              disabled={isSaving}
              onChange={(event) => updateValue("amount", event.target.value)}
              error={showValidationErrors ? fieldErrors.amount : undefined}
            />

            <FormField
              id="allocation-date"
              label={TH_TEXT.allocation.date}
              type="date"
              max={getTodayDateString()}
              value={values.allocation_date}
              disabled={isSaving}
              onChange={(event) => updateValue("allocation_date", event.target.value)}
              error={showValidationErrors ? fieldErrors.date : undefined}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="allocation-note" className={labelClassName}>
                {TH_TEXT.allocation.note}
              </label>
              <textarea
                id="allocation-note"
                value={values.note}
                rows={3}
                disabled={isSaving}
                placeholder={TH_TEXT.transaction.notePlaceholder}
                onChange={(event) => updateValue("note", event.target.value)}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-500/20"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={labelClassName}>{TH_TEXT.allocation.destinationPanel}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {TH_TEXT.allocation.destinationHint}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSaving || values.destinations.length >= 10}
              onClick={addDestination}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M10 4a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 10 4Z" />
              </svg>
              {TH_TEXT.allocation.addDestination}
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            {values.destinations.map((destination, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/30 sm:grid-cols-[minmax(0,1fr)_132px_auto] sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`allocation-destination-${index}`} className={labelClassName}>
                    {TH_TEXT.allocation.destinationWallet}
                  </label>
                  <select
                    id={`allocation-destination-${index}`}
                    value={destination.wallet_id}
                    disabled={isSaving}
                    onChange={(event) => updateDestination(index, "wallet_id", event.target.value)}
                    className={selectClassName}
                  >
                    <option value="">{TH_TEXT.allocation.selectDestinationWallet}</option>
                    {getDestinationWallets(index).map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {getAllocationWalletLabel(wallet, wallets)} ({formatWalletMoney(wallet.balance, wallet.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <FormField
                  id={`allocation-destination-amount-${index}`}
                  label={TH_TEXT.allocation.destinationAmount}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={destination.amount}
                  placeholder={TH_TEXT.transaction.amountPlaceholder}
                  disabled={isSaving}
                  onChange={(event) => updateDestination(index, "amount", event.target.value)}
                />

                <button
                  type="button"
                  disabled={isSaving || values.destinations.length === 1}
                  onClick={() => removeDestination(index)}
                  aria-label={`${TH_TEXT.allocation.removeDestination} ${index + 1}`}
                  title={TH_TEXT.allocation.removeDestination}
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M6.06 4.5 4.5 6.06 8.44 10 4.5 13.94 6.06 15.5 10 11.56l3.94 3.94 1.56-1.56L11.56 10l3.94-3.94-1.56-1.56L10 8.44 6.06 4.5Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs text-slate-500 dark:text-slate-400">{TH_TEXT.allocation.allocated}</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                {formatMoneyCents(allocatedCents)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs text-slate-500 dark:text-slate-400">{TH_TEXT.allocation.remaining}</p>
              <p className={[
                "mt-1 text-lg font-bold",
                remainingCents === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
              ].join(" ")}>
                {formatMoneyCents(remainingCents)}
              </p>
            </div>
          </div>

          {showValidationErrors && destinationErrors.length > 0 && (
            <div
              role="alert"
              className="mt-3 space-y-1 text-sm text-red-600 dark:text-red-400"
            >
              {destinationErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-7 flex justify-end">
        <Button type="submit" disabled={isSaving || hasFieldErrors}>
          {isSaving
            ? TH_TEXT.allocation.saving
            : isEditMode
              ? TH_TEXT.allocation.saveChanges
              : TH_TEXT.allocation.submit}
        </Button>
      </div>
    </form>
  );
}
