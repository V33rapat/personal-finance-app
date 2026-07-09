"use client";

import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { TH_TEXT } from "@/constants/th";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import type { TransferFormValues } from "../hooks/useTransfer";
import TransferBalancePreview from "./TransferBalancePreview";

interface TransferFormProps {
  wallets: Wallet[];
  isSaving: boolean;
  error?: string | null;
  onSubmit: (values: TransferFormValues) => Promise<boolean>;
}

type FieldName = keyof TransferFormValues;
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedFields = Partial<Record<FieldName, boolean>>;

const selectClassName = [
  "h-[46px] w-full rounded-xl border border-slate-200 bg-white/60 px-4 text-sm font-medium text-slate-800",
  "outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20",
  "dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-500/20",
].join(" ");

const labelClassName =
  "text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400";

function getTodayDateString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split("T")[0];
}

function formatMoney(balance: string, currency: string) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(balance));
}

function toMoneyNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }

  return typeof value === "number" ? value : Number(value);
}

function getInitialValues(wallets: Wallet[]): TransferFormValues {
  const sourceWallet = wallets[0] ?? null;
  const destinationWallet =
    wallets.find((wallet) => wallet.id !== sourceWallet?.id) ?? null;

  return {
    from_wallet_id: sourceWallet?.id ?? "",
    to_wallet_id: destinationWallet?.id ?? "",
    amount: "",
    transfer_date: getTodayDateString(),
    note: "",
  };
}

function getFieldErrors(values: TransferFormValues, wallets: Wallet[]): FieldErrors {
  const errors: FieldErrors = {};
  const sourceWallet = wallets.find((wallet) => wallet.id === values.from_wallet_id);
  const amount = toMoneyNumber(values.amount);
  const sourceBalance = toMoneyNumber(sourceWallet?.balance);

  if (!values.from_wallet_id) {
    errors.from_wallet_id = TH_TEXT.transfer.sourceWalletRequired;
  }

  if (!values.to_wallet_id) {
    errors.to_wallet_id = TH_TEXT.transfer.destinationWalletRequired;
  }

  if (
    values.from_wallet_id &&
    values.to_wallet_id &&
    values.from_wallet_id === values.to_wallet_id
  ) {
    errors.to_wallet_id = TH_TEXT.transfer.sameWallet;
  }

  if (!values.amount) {
    errors.amount = TH_TEXT.transfer.amountRequired;
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = TH_TEXT.transfer.amountInvalid;
  } else if (sourceWallet && Number.isFinite(sourceBalance) && sourceBalance < amount) {
    errors.amount = TH_TEXT.transfer.balanceNotEnough;
  }

  if (!values.transfer_date) {
    errors.transfer_date = TH_TEXT.transfer.dateRequired;
  } else if (values.transfer_date > getTodayDateString()) {
    errors.transfer_date = TH_TEXT.transfer.futureDate;
  }

  return errors;
}

function getVisibleErrors(
  errors: FieldErrors,
  touched: TouchedFields,
  submitted: boolean
) {
  if (submitted) {
    return errors;
  }

  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => touched[field as FieldName])
  ) as FieldErrors;
}

export default function TransferForm({
  wallets,
  isSaving,
  error,
  onSubmit,
}: TransferFormProps) {
  const [values, setValues] = useState<TransferFormValues>(() =>
    getInitialValues(wallets)
  );
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitted, setSubmitted] = useState(false);

  const sourceWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === values.from_wallet_id) ?? null,
    [values.from_wallet_id, wallets]
  );
  const destinationWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === values.to_wallet_id) ?? null,
    [values.to_wallet_id, wallets]
  );
  const fieldErrors = useMemo(
    () => getFieldErrors(values, wallets),
    [values, wallets]
  );
  const visibleErrors = useMemo(
    () => getVisibleErrors(fieldErrors, touched, submitted),
    [fieldErrors, submitted, touched]
  );
  const hasErrors = Object.keys(fieldErrors).length > 0;
  const submitDisabled = isSaving || hasErrors;

  const updateValue = <Key extends FieldName>(
    key: Key,
    value: TransferFormValues[Key]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const handleSwapWallets = () => {
    setValues((current) => ({
      ...current,
      from_wallet_id: current.to_wallet_id,
      to_wallet_id: current.from_wallet_id,
    }));
    setTouched((current) => ({
      ...current,
      from_wallet_id: true,
      to_wallet_id: true,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasErrors || isSaving) return;

    const success = await onSubmit(values);

    if (!success) return;

    setValues((current) => ({
      ...current,
      amount: "",
      note: "",
    }));
    setTouched({});
    setSubmitted(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          {TH_TEXT.transfer.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {TH_TEXT.transfer.formDescription}
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="transfer-source-wallet" className={labelClassName}>
              {TH_TEXT.transfer.sourceWallet}
            </label>
            <select
              id="transfer-source-wallet"
              value={values.from_wallet_id}
              onChange={(event) =>
                updateValue("from_wallet_id", event.target.value)
              }
              onBlur={() =>
                setTouched((current) => ({ ...current, from_wallet_id: true }))
              }
              className={selectClassName}
              aria-invalid={!!visibleErrors.from_wallet_id}
            >
              <option value="">{TH_TEXT.transfer.selectSourceWallet}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} - {formatMoney(wallet.balance, wallet.currency)}
                </option>
              ))}
            </select>
            <div className="min-h-[18px]">
              {visibleErrors.from_wallet_id && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {visibleErrors.from_wallet_id}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwapWallets}
            disabled={isSaving || !values.from_wallet_id || !values.to_wallet_id}
            aria-label={TH_TEXT.transfer.swapWallets}
            title={TH_TEXT.transfer.swapWallets}
            className="mx-auto mt-6 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-violet-300 lg:mt-7"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" />
            </svg>
          </button>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="transfer-destination-wallet" className={labelClassName}>
              {TH_TEXT.transfer.destinationWallet}
            </label>
            <select
              id="transfer-destination-wallet"
              value={values.to_wallet_id}
              onChange={(event) =>
                updateValue("to_wallet_id", event.target.value)
              }
              onBlur={() =>
                setTouched((current) => ({ ...current, to_wallet_id: true }))
              }
              className={selectClassName}
              aria-invalid={!!visibleErrors.to_wallet_id}
            >
              <option value="">{TH_TEXT.transfer.selectDestinationWallet}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} - {formatMoney(wallet.balance, wallet.currency)}
                </option>
              ))}
            </select>
            <div className="min-h-[18px]">
              {visibleErrors.to_wallet_id && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {visibleErrors.to_wallet_id}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="transfer-amount"
            label={TH_TEXT.transfer.amount}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.amount}
            error={visibleErrors.amount}
            placeholder={TH_TEXT.transaction.amountPlaceholder}
            onChange={(event) => updateValue("amount", event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, amount: true }))}
          />

          <FormField
            id="transfer-date"
            label={TH_TEXT.transfer.date}
            type="date"
            max={getTodayDateString()}
            value={values.transfer_date}
            error={visibleErrors.transfer_date}
            onChange={(event) =>
              updateValue("transfer_date", event.target.value)
            }
            onBlur={() =>
              setTouched((current) => ({ ...current, transfer_date: true }))
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="transfer-note" className={labelClassName}>
            {TH_TEXT.transfer.note}
          </label>
          <textarea
            id="transfer-note"
            value={values.note}
            rows={3}
            placeholder={TH_TEXT.transaction.notePlaceholder}
            onChange={(event) => updateValue("note", event.target.value)}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-500/20"
          />
        </div>

        <TransferBalancePreview
          sourceWallet={sourceWallet}
          destinationWallet={destinationWallet}
          amount={values.amount}
        />
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {submitDisabled && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {TH_TEXT.transfer.submitHint}
          </p>
        )}
        <Button
          type="submit"
          disabled={submitDisabled}
          className="sm:ml-auto"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M3 10a1 1 0 0 1 1-1h9.59l-3.3-3.29a1 1 0 1 1 1.42-1.42l5 5a1 1 0 0 1 0 1.42l-5 5a1 1 0 0 1-1.42-1.42l3.3-3.29H4a1 1 0 0 1-1-1Z" />
          </svg>
          {isSaving ? TH_TEXT.transfer.saving : TH_TEXT.transfer.submit}
        </Button>
      </div>
    </form>
  );
}
