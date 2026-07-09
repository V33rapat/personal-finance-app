"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";
import { readApiResponse } from "@/lib/api";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";

interface TransferWallet {
  id: string;
  name: string;
}

interface ApiTransfer {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  from_transaction_id: string | null;
  to_transaction_id: string | null;
  amount: string | number;
  note: string | null;
  transfer_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  wallets_transfers_from_wallet_idTowallets?: TransferWallet | null;
  wallets_transfers_to_wallet_idTowallets?: TransferWallet | null;
}

export interface Transfer {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  sourceWalletName: string;
  destinationWalletName: string;
  from_transaction_id: string | null;
  to_transaction_id: string | null;
  amount: string;
  note: string;
  transfer_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TransferFormValues {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: string;
  transfer_date: string;
  note: string;
}

interface UseTransferOptions {
  wallets?: Pick<Wallet, "id" | "name" | "balance">[];
  autoLoad?: boolean;
  onChanged?: () => void | Promise<void>;
}

function getDateOnly(date: string | null | undefined) {
  return date ? date.split("T")[0] : "";
}

function getTodayDateString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split("T")[0];
}

function toMoneyNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }

  return typeof value === "number" ? value : Number(value);
}

function mapApiTransfer(transfer: ApiTransfer): Transfer {
  return {
    id: transfer.id,
    from_wallet_id: transfer.from_wallet_id,
    to_wallet_id: transfer.to_wallet_id,
    sourceWalletName:
      transfer.wallets_transfers_from_wallet_idTowallets?.name ?? "",
    destinationWalletName:
      transfer.wallets_transfers_to_wallet_idTowallets?.name ?? "",
    from_transaction_id: transfer.from_transaction_id,
    to_transaction_id: transfer.to_transaction_id,
    amount: String(transfer.amount ?? "0"),
    note: transfer.note ?? "",
    transfer_date: getDateOnly(transfer.transfer_date),
    created_at: transfer.created_at,
    updated_at: transfer.updated_at,
    deleted_at: transfer.deleted_at,
  };
}

function toTransferPayload(values: TransferFormValues) {
  return {
    from_wallet_id: values.from_wallet_id,
    to_wallet_id: values.to_wallet_id,
    amount: Number(values.amount),
    transfer_date: values.transfer_date,
    note: values.note.trim() || null,
  };
}

function upsertTransfer(transfers: Transfer[], transfer: Transfer) {
  const exists = transfers.some((item) => item.id === transfer.id);

  if (!exists) {
    return [transfer, ...transfers];
  }

  return transfers.map((item) => (item.id === transfer.id ? transfer : item));
}

export function useTransfer({
  wallets = [],
  autoLoad = false,
  onChanged,
}: UseTransferOptions = {}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletMap = useMemo(() => {
    return new Map(wallets.map((wallet) => [wallet.id, wallet]));
  }, [wallets]);

  const validateTransfer = useCallback(
    (values: TransferFormValues, existing?: Transfer | null) => {
      const amount = toMoneyNumber(values.amount);
      const sourceWallet = walletMap.get(values.from_wallet_id);

      if (!values.from_wallet_id) {
        return TH_TEXT.transfer.sourceWalletRequired;
      }

      if (!values.to_wallet_id) {
        return TH_TEXT.transfer.destinationWalletRequired;
      }

      if (values.from_wallet_id === values.to_wallet_id) {
        return TH_TEXT.transfer.sameWallet;
      }

      if (!values.amount) {
        return TH_TEXT.transfer.amountRequired;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return TH_TEXT.transfer.amountInvalid;
      }

      if (!values.transfer_date) {
        return TH_TEXT.transfer.dateRequired;
      }

      if (values.transfer_date > getTodayDateString()) {
        return TH_TEXT.transfer.futureDate;
      }

      if (!sourceWallet) {
        return TH_TEXT.transfer.sourceWalletNotFound;
      }

      const existingAmount = toMoneyNumber(existing?.amount);
      const sourceBalance = toMoneyNumber(sourceWallet.balance);
      let availableBalance = Number.isFinite(sourceBalance) ? sourceBalance : 0;

      if (existing && Number.isFinite(existingAmount)) {
        if (existing.from_wallet_id === values.from_wallet_id) {
          availableBalance += existingAmount;
        }

        if (existing.to_wallet_id === values.from_wallet_id) {
          availableBalance -= existingAmount;
        }
      }

      if (availableBalance < amount) {
        return TH_TEXT.transfer.balanceNotEnough;
      }

      return null;
    },
    [walletMap]
  );

  const loadTransfers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/transfer");
      const data = await readApiResponse<ApiTransfer[]>(response, router);
      const nextTransfers = Array.isArray(data) ? data.map(mapApiTransfer) : [];

      setTransfers(nextTransfers);
      return nextTransfers;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : TH_TEXT.transfer.loadFailed;

      setError(message);
      showToast({
        title: TH_TEXT.transfer.loadFailed,
        description: message,
        type: "error",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [router, showToast]);

  const loadTransfer = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/transfer/${id}`);
        const data = await readApiResponse<ApiTransfer>(response, router);
        const transfer = mapApiTransfer(data);

        setTransfers((current) => upsertTransfer(current, transfer));
        return transfer;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : TH_TEXT.transfer.loadOneFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transfer.loadOneFailed,
          description: message,
          type: "error",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [router, showToast]
  );

  const createTransfer = useCallback(
    async (values: TransferFormValues) => {
      const validationError = validateTransfer(values);

      if (validationError) {
        setError(validationError);
        showToast({
          title: TH_TEXT.transfer.createFailed,
          description: validationError,
          type: "error",
        });
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toTransferPayload(values)),
        });
        const data = await readApiResponse<ApiTransfer>(response, router);
        const transfer = mapApiTransfer(data);

        setTransfers((current) => [transfer, ...current]);
        await onChanged?.();
        showToast({ title: TH_TEXT.transfer.createSuccess });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : TH_TEXT.transfer.createFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transfer.createFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [onChanged, router, showToast, validateTransfer]
  );

  const updateTransfer = useCallback(
    async (id: string, values: TransferFormValues) => {
      const existing = transfers.find((transfer) => transfer.id === id) ?? null;
      const validationError = validateTransfer(values, existing);

      if (validationError) {
        setError(validationError);
        showToast({
          title: TH_TEXT.transfer.updateFailed,
          description: validationError,
          type: "error",
        });
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/transfer/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toTransferPayload(values)),
        });
        const data = await readApiResponse<ApiTransfer>(response, router);
        const transfer = mapApiTransfer(data);

        setTransfers((current) => upsertTransfer(current, transfer));
        await onChanged?.();
        showToast({ title: TH_TEXT.transfer.updateSuccess });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : TH_TEXT.transfer.updateFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transfer.updateFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [onChanged, router, showToast, transfers, validateTransfer]
  );

  const deleteTransfer = useCallback(
    async (id: string) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/transfer/${id}`, {
          method: "DELETE",
        });

        await readApiResponse<ApiTransfer>(response, router);
        setTransfers((current) =>
          current.filter((transfer) => transfer.id !== id)
        );
        await onChanged?.();
        showToast({ title: TH_TEXT.transfer.deleteSuccess });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : TH_TEXT.transfer.deleteFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transfer.deleteFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [onChanged, router, showToast]
  );

  useEffect(() => {
    if (!autoLoad) return;

    void loadTransfers();
  }, [autoLoad, loadTransfers]);

  return {
    transfers,
    isLoading,
    isSaving,
    error,
    loadTransfers,
    loadTransfer,
    createTransfer,
    updateTransfer,
    deleteTransfer,
    reload: loadTransfers,
  };
}
