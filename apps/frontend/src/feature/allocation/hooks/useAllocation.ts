"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import { readApiResponse } from "@/lib/api";
import { getAllocationValidationError } from "../lib/allocationValidation";

interface ApiAllocationDestination {
  transfer_id: string;
  wallet_id: string;
  wallet_name: string;
  amount: string | number;
}

interface ApiAllocation {
  id: string;
  source_wallet_id: string;
  source_wallet_name: string;
  amount: string | number;
  allocation_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  destinations: ApiAllocationDestination[];
}

export interface AllocationDestinationValues {
  wallet_id: string;
  amount: string;
}

export interface AllocationFormValues {
  source_wallet_id: string;
  amount: string;
  allocation_date: string;
  note: string;
  destinations: AllocationDestinationValues[];
}

export interface MoneyAllocation {
  id: string;
  source_wallet_id: string;
  source_wallet_name: string;
  amount: string;
  allocation_date: string;
  note: string;
  created_at: string;
  updated_at: string;
  destinations: Array<{
    transfer_id: string;
    wallet_id: string;
    wallet_name: string;
    amount: string;
  }>;
}

interface UseAllocationOptions {
  wallets: Wallet[];
  onChanged?: () => void | Promise<void>;
}

function getDateOnly(value: string | null | undefined) {
  return value ? value.split("T")[0] : "";
}

function mapApiAllocation(allocation: ApiAllocation): MoneyAllocation {
  return {
    id: allocation.id,
    source_wallet_id: allocation.source_wallet_id,
    source_wallet_name: allocation.source_wallet_name,
    amount: String(allocation.amount ?? "0"),
    allocation_date: getDateOnly(allocation.allocation_date),
    note: allocation.note ?? "",
    created_at: allocation.created_at,
    updated_at: allocation.updated_at,
    destinations: Array.isArray(allocation.destinations)
      ? allocation.destinations.map((destination) => ({
          transfer_id: destination.transfer_id,
          wallet_id: destination.wallet_id,
          wallet_name: destination.wallet_name,
          amount: String(destination.amount ?? "0"),
        }))
      : [],
  };
}

function toPayload(values: AllocationFormValues) {
  return {
    source_wallet_id: values.source_wallet_id,
    amount: Number(values.amount),
    allocation_date: values.allocation_date,
    note: values.note.trim() || null,
    destinations: values.destinations.map((destination) => ({
      wallet_id: destination.wallet_id,
      amount: Number(destination.amount),
    })),
  };
}

export function useAllocation({ wallets, onChanged }: UseAllocationOptions) {
  const router = useRouter();
  const { showToast } = useToast();
  const [allocations, setAllocations] = useState<MoneyAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/allocation");
      const data = await readApiResponse<ApiAllocation[]>(response, router);
      const nextAllocations = Array.isArray(data) ? data.map(mapApiAllocation) : [];

      setAllocations(nextAllocations);
      return nextAllocations;
    } catch (err) {
      const message = err instanceof Error ? err.message : TH_TEXT.allocation.loadFailed;

      setError(message);
      showToast({
        title: TH_TEXT.allocation.loadFailed,
        description: message,
        type: "error",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [router, showToast]);

  const createAllocation = useCallback(
    async (values: AllocationFormValues) => {
      const validationError = getAllocationValidationError(values, wallets);

      if (validationError || isSaving) {
        if (validationError) {
          setError(validationError);
        }
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/allocation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(values)),
        });
        const data = await readApiResponse<ApiAllocation>(response, router);
        const allocation = mapApiAllocation(data);

        setAllocations((current) => [allocation, ...current]);
        await onChanged?.();
        showToast({ title: TH_TEXT.allocation.createSuccess });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : TH_TEXT.allocation.createFailed;

        setError(message);
        showToast({
          title: TH_TEXT.allocation.createFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, onChanged, router, showToast, wallets]
  );

  const updateAllocation = useCallback(
    async (id: string, values: AllocationFormValues) => {
      const existing = allocations.find((allocation) => allocation.id === id) ?? null;
      const validationError = getAllocationValidationError(values, wallets, existing);

      if (validationError || isSaving) {
        if (validationError) {
          setError(validationError);
        }
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/allocation/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(values)),
        });
        const data = await readApiResponse<ApiAllocation>(response, router);
        const allocation = mapApiAllocation(data);

        setAllocations((current) =>
          current.map((item) => (item.id === allocation.id ? allocation : item))
        );
        await onChanged?.();
        showToast({ title: TH_TEXT.allocation.updateSuccess });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : TH_TEXT.allocation.updateFailed;

        setError(message);
        showToast({
          title: TH_TEXT.allocation.updateFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [allocations, isSaving, onChanged, router, showToast, wallets]
  );

  const deleteAllocation = useCallback(
    async (id: string) => {
      if (isSaving) {
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/allocation/${id}`, { method: "DELETE" });
        await readApiResponse<{ id: string }>(response, router);

        setAllocations((current) => current.filter((allocation) => allocation.id !== id));
        await onChanged?.();
        showToast({ title: TH_TEXT.allocation.deleteSuccess });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : TH_TEXT.allocation.deleteFailed;

        setError(message);
        showToast({
          title: TH_TEXT.allocation.deleteFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, onChanged, router, showToast]
  );

  useEffect(() => {
    void loadAllocations();
  }, [loadAllocations]);

  return {
    allocations,
    isLoading,
    isSaving,
    error,
    loadAllocations,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    reload: loadAllocations,
  };
}
