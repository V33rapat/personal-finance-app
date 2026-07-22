"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api";

export interface DashboardSummary {
  month: string;
  total_balance: string;
  monthly_spending: string;
  active_wallet_count: number;
}

function getBangkokMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts();
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : "";
}

export function useDashboardSummary() {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getBangkokMonth);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMonth = getBangkokMonth();

  const loadSummary = useCallback(
    async (month: string) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);
      setError(null);
      setSummary(null);

      try {
        const response = await fetch(
          `/api/dashboard/summary?month=${encodeURIComponent(month)}`,
          { signal: controller.signal }
        );
        const data = await readApiResponse<DashboardSummary>(response, router);

        if (!controller.signal.aborted) {
          setSummary(data);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load dashboard summary");
      } finally {
        if (
          abortControllerRef.current === controller &&
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    if (!selectedMonth) {
      return;
    }

    void loadSummary(selectedMonth);
  }, [loadSummary, selectedMonth]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const selectMonth = useCallback((month: string) => {
    if (month) {
      setSelectedMonth(month);
    }
  }, []);

  const retry = useCallback(() => {
    if (selectedMonth) {
      void loadSummary(selectedMonth);
    }
  }, [loadSummary, selectedMonth]);

  return {
    summary,
    selectedMonth,
    currentMonth,
    isLoading,
    error,
    selectMonth,
    retry,
  };
}
