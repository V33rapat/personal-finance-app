"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";
import { readApiResponse } from "@/lib/api";
import type { DashboardWalletSummaryResponse } from "../lib/walletSummary";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDashboardWalletSummary() {
  const router = useRouter();
  const { showToast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [summary, setSummary] = useState<DashboardWalletSummaryResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/wallet-summary", {
        signal: controller.signal,
      });
      const data = await readApiResponse<DashboardWalletSummaryResponse>(
        response,
        router,
      );

      if (!controller.signal.aborted) {
        setSummary(data);
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(
          getErrorMessage(
            requestError,
            TH_TEXT.dashboard.walletSummaryLoadFailed,
          ),
        );
      }
    } finally {
      if (
        abortControllerRef.current === controller &&
        !controller.signal.aborted
      ) {
        setIsLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    void load();

    return () => abortControllerRef.current?.abort();
  }, [load]);

  const saveWallets = useCallback(
    async (walletIds: string[]) => {
      if (isSaving) {
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/dashboard/wallet-summary", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_ids: walletIds }),
        });
        const data = await readApiResponse<DashboardWalletSummaryResponse>(
          response,
          router,
        );

        setSummary(data);
        showToast({ title: TH_TEXT.dashboard.walletSummarySaveSuccess });
        return true;
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            TH_TEXT.dashboard.walletSummarySaveFailed,
          ),
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, router, showToast],
  );

  return { summary, isLoading, isSaving, error, load, saveWallets };
}
