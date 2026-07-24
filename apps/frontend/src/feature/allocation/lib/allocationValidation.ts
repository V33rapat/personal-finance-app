import { TH_TEXT } from "@/constants/th";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import type { MoneyAllocation, AllocationFormValues } from "../hooks/useAllocation";
import { getEligibleAllocationWallets } from "./allocationWallet";

export interface AllocationValidationErrors {
  sourceWallet?: string;
  amount?: string;
  date?: string;
  destinationWallet?: string;
  destinationAmount?: string;
  remaining?: string;
}

export function getTodayDateString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split("T")[0];
}

export function toMoneyCents(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return Number.NaN;
  }

  const [whole, fraction = ""] = text.split(".");
  const wholeCents = Number(whole) * 100;
  const fractionCents = Number(fraction.padEnd(2, "0"));
  const cents = wholeCents + fractionCents;

  return Number.isSafeInteger(cents) ? cents : Number.NaN;
}

export function formatMoneyCents(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function getAllocationRemainingCents(values: AllocationFormValues) {
  const amountCents = toMoneyCents(values.amount);
  const destinationCents = values.destinations.reduce(
    (total, destination) => total + (toMoneyCents(destination.amount) || 0),
    0
  );

  return (Number.isFinite(amountCents) ? amountCents : 0) - destinationCents;
}

function getMoneyInputError(value: string | number, requiredMessage: string) {
  const text = String(value ?? "").trim();

  if (!text || !/^\d+(?:\.\d+)?$/.test(text)) {
    return requiredMessage;
  }

  const fraction = text.split(".")[1];

  if (fraction && fraction.length > 2) {
    return TH_TEXT.allocation.amountPrecisionInvalid;
  }

  const amountCents = toMoneyCents(text);

  return !Number.isFinite(amountCents) || amountCents <= 0 ? requiredMessage : undefined;
}

function getAvailableSourceCents(
  sourceWallet: Wallet | undefined,
  sourceWalletId: string,
  existing: MoneyAllocation | null | undefined
) {
  let availableCents = toMoneyCents(sourceWallet?.balance);

  if (!Number.isFinite(availableCents)) {
    availableCents = 0;
  }

  if (!existing) {
    return availableCents;
  }

  if (existing.source_wallet_id === sourceWalletId) {
    availableCents += toMoneyCents(existing.amount) || 0;
  }

  const existingDestination = existing.destinations.find(
    (destination) => destination.wallet_id === sourceWalletId
  );

  if (existingDestination) {
    availableCents -= toMoneyCents(existingDestination.amount) || 0;
  }

  return availableCents;
}

export function getAllocationValidationErrors(
  values: AllocationFormValues,
  wallets: Wallet[],
  existing?: MoneyAllocation | null
): AllocationValidationErrors {
  const errors: AllocationValidationErrors = {};
  const eligibleWallets = getEligibleAllocationWallets(wallets);
  const eligibleWalletIds = new Set(eligibleWallets.map((wallet) => wallet.id));
  const sourceWallet = eligibleWallets.find(
    (wallet) => wallet.id === values.source_wallet_id
  );
  const amountCents = toMoneyCents(values.amount);

  if (!values.source_wallet_id) {
    errors.sourceWallet = TH_TEXT.allocation.sourceWalletRequired;
  } else if (!eligibleWalletIds.has(values.source_wallet_id)) {
    errors.sourceWallet = TH_TEXT.allocation.walletUnavailable;
  }

  errors.amount = getMoneyInputError(values.amount, TH_TEXT.allocation.amountInvalid);

  if (!values.allocation_date) {
    errors.date = TH_TEXT.allocation.dateRequired;
  } else if (values.allocation_date > getTodayDateString()) {
    errors.date = TH_TEXT.allocation.futureDate;
  }

  if (values.destinations.length < 1) {
    errors.destinationWallet = TH_TEXT.allocation.destinationRequired;
  } else if (values.destinations.length > 10) {
    errors.destinationWallet = TH_TEXT.allocation.destinationLimit;
  }

  const destinationIds = new Set<string>();
  let destinationCents = 0;

  for (const destination of values.destinations) {
    const destinationAmountCents = toMoneyCents(destination.amount);

    if (!destination.wallet_id) {
      errors.destinationWallet ??= TH_TEXT.allocation.destinationRequired;
    } else if (!eligibleWalletIds.has(destination.wallet_id)) {
      errors.destinationWallet ??= TH_TEXT.allocation.walletUnavailable;
    } else if (destination.wallet_id === values.source_wallet_id) {
      errors.destinationWallet ??= TH_TEXT.allocation.sameWallet;
    } else if (destinationIds.has(destination.wallet_id)) {
      errors.destinationWallet ??= TH_TEXT.allocation.destinationDuplicate;
    }

    errors.destinationAmount ??= getMoneyInputError(
      destination.amount,
      TH_TEXT.allocation.destinationAmountInvalid
    );

    if (destination.wallet_id) {
      destinationIds.add(destination.wallet_id);
    }

    destinationCents += Number.isFinite(destinationAmountCents) ? destinationAmountCents : 0;
  }

  if (
    !errors.amount &&
    !errors.destinationWallet &&
    !errors.destinationAmount &&
    destinationCents !== amountCents
  ) {
    errors.remaining = TH_TEXT.allocation.remainingMustBeZero;
  }

  if (!errors.sourceWallet && !errors.amount) {
    const availableSourceCents = getAvailableSourceCents(
      sourceWallet,
      values.source_wallet_id,
      existing
    );

    if (availableSourceCents < amountCents) {
      errors.amount = TH_TEXT.allocation.balanceNotEnough;
    }
  }

  return errors;
}

export function getAllocationValidationError(
  values: AllocationFormValues,
  wallets: Wallet[],
  existing?: MoneyAllocation | null
) {
  const errors = getAllocationValidationErrors(values, wallets, existing);

  return (
    errors.sourceWallet ??
    errors.amount ??
    errors.date ??
    errors.destinationWallet ??
    errors.destinationAmount ??
    errors.remaining ??
    null
  );
}
