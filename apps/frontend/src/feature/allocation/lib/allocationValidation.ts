import { TH_TEXT } from "@/constants/th";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import type { MoneyAllocation, AllocationFormValues } from "../hooks/useAllocation";
import { getEligibleAllocationWallets } from "./allocationWallet";

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

export function getAllocationValidationError(
  values: AllocationFormValues,
  wallets: Wallet[],
  existing?: MoneyAllocation | null
) {
  const eligibleWallets = getEligibleAllocationWallets(wallets);
  const eligibleWalletIds = new Set(eligibleWallets.map((wallet) => wallet.id));
  const sourceWallet = eligibleWallets.find(
    (wallet) => wallet.id === values.source_wallet_id
  );
  const amountCents = toMoneyCents(values.amount);

  if (!values.source_wallet_id) {
    return TH_TEXT.allocation.sourceWalletRequired;
  }

  if (!eligibleWalletIds.has(values.source_wallet_id)) {
    return TH_TEXT.allocation.walletUnavailable;
  }

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return TH_TEXT.allocation.amountInvalid;
  }

  if (!values.allocation_date) {
    return TH_TEXT.allocation.dateRequired;
  }

  if (values.allocation_date > getTodayDateString()) {
    return TH_TEXT.allocation.futureDate;
  }

  if (values.destinations.length < 1) {
    return TH_TEXT.allocation.destinationRequired;
  }

  if (values.destinations.length > 10) {
    return TH_TEXT.allocation.destinationLimit;
  }

  const destinationIds = new Set<string>();
  let destinationCents = 0;

  for (const destination of values.destinations) {
    const destinationAmountCents = toMoneyCents(destination.amount);

    if (!destination.wallet_id) {
      return TH_TEXT.allocation.destinationRequired;
    }

    if (!eligibleWalletIds.has(destination.wallet_id)) {
      return TH_TEXT.allocation.walletUnavailable;
    }

    if (destination.wallet_id === values.source_wallet_id) {
      return TH_TEXT.allocation.sameWallet;
    }

    if (destinationIds.has(destination.wallet_id)) {
      return TH_TEXT.allocation.destinationDuplicate;
    }

    if (!Number.isFinite(destinationAmountCents) || destinationAmountCents <= 0) {
      return TH_TEXT.allocation.destinationAmountInvalid;
    }

    destinationIds.add(destination.wallet_id);
    destinationCents += destinationAmountCents;
  }

  if (destinationCents !== amountCents) {
    return TH_TEXT.allocation.remainingMustBeZero;
  }

  const availableSourceCents = getAvailableSourceCents(
    sourceWallet,
    values.source_wallet_id,
    existing
  );

  if (availableSourceCents < amountCents) {
    return TH_TEXT.allocation.balanceNotEnough;
  }

  return null;
}
