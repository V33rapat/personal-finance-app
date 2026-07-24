"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api";
import {
  getCurrentBangkokWeekToDate,
  type DashboardDateRange,
} from "../lib/date";

export type DashboardTransactionType = "income" | "expense";

export interface DashboardCategoryAmount {
  category_id: string | null;
  category_name: string;
  category_color: string | null;
  amount: string;
}

export interface DashboardOverviewDay {
  date: string;
  income_total: string;
  expense_total: string;
  income_categories: DashboardCategoryAmount[];
  expense_categories: DashboardCategoryAmount[];
}

export interface DashboardOverview {
  period_start: string;
  period_end: string;
  totals: {
    income: string;
    expense: string;
    net: string;
  };
  days: DashboardOverviewDay[];
  expense_categories: DashboardCategoryAmount[];
}

export interface DashboardPreferences {
  period_start: string;
  period_end: string;
  is_category_breakdown_enabled: boolean;
  hidden_category_ids: string[];
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDashboardOverview() {
  const router = useRouter();
  const overviewAbortControllerRef = useRef<AbortController | null>(null);
  const preferencesRef = useRef<DashboardPreferences | null>(null);
  const loadedRangeRef = useRef<DashboardDateRange | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const latestSaveIdRef = useRef(0);
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (range: DashboardDateRange) => {
      overviewAbortControllerRef.current?.abort();

      const controller = new AbortController();
      overviewAbortControllerRef.current = controller;
      setIsLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({ start: range.start, end: range.end });
        const response = await fetch(`/api/dashboard/overview?${query.toString()}`, {
          signal: controller.signal,
        });
        const data = await readApiResponse<DashboardOverview>(response, router);

        if (!controller.signal.aborted) {
          setOverview(data);
          loadedRangeRef.current = {
            start: data.period_start,
            end: data.period_end,
          };
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError, "Failed to load dashboard overview"));
        }
      } finally {
        if (
          overviewAbortControllerRef.current === controller &&
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      }
    },
    [router]
  );

  const loadPreferences = useCallback(async () => {
    overviewAbortControllerRef.current?.abort();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/preferences");
      const data = await readApiResponse<DashboardPreferences>(response, router);

      preferencesRef.current = data;
      setPreferences(data);
      await loadOverview({ start: data.period_start, end: data.period_end });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load dashboard preferences"));
      setIsLoading(false);
    }
  }, [loadOverview, router]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    return () => {
      overviewAbortControllerRef.current?.abort();
    };
  }, []);

  const savePreferences = useCallback(
    (nextPreferences: DashboardPreferences) => {
      const previousPreferences = preferencesRef.current;
      const saveId = latestSaveIdRef.current + 1;
      latestSaveIdRef.current = saveId;
      preferencesRef.current = nextPreferences;
      setPreferences(nextPreferences);
      setIsSaving(true);
      setError(null);

      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch("/api/dashboard/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextPreferences),
          });
          const savedPreferences = await readApiResponse<DashboardPreferences>(response, router);

          if (saveId !== latestSaveIdRef.current) {
            return;
          }

          preferencesRef.current = savedPreferences;
          setPreferences(savedPreferences);

          if (
            loadedRangeRef.current?.start !== savedPreferences.period_start ||
            loadedRangeRef.current?.end !== savedPreferences.period_end
          ) {
            await loadOverview({
              start: savedPreferences.period_start,
              end: savedPreferences.period_end,
            });
          }
        })
        .catch((requestError: unknown) => {
          if (saveId !== latestSaveIdRef.current) {
            return;
          }

          preferencesRef.current = previousPreferences;
          setPreferences(previousPreferences);
          setError(getErrorMessage(requestError, "Failed to save dashboard preferences"));
        })
        .finally(() => {
          if (saveId === latestSaveIdRef.current) {
            setIsSaving(false);
          }
        });
    },
    [loadOverview, router]
  );

  const updateRange = useCallback(
    (range: DashboardDateRange) => {
      if (!preferencesRef.current) return;

      savePreferences({
        ...preferencesRef.current,
        period_start: range.start,
        period_end: range.end,
      });
    },
    [savePreferences]
  );

  const resetToCurrentWeek = useCallback(() => {
    updateRange(getCurrentBangkokWeekToDate());
  }, [updateRange]);

  const setCategoryBreakdownEnabled = useCallback(
    (isEnabled: boolean) => {
      if (!preferencesRef.current) return;

      savePreferences({
        ...preferencesRef.current,
        is_category_breakdown_enabled: isEnabled,
      });
    },
    [savePreferences]
  );

  const setCategoryHidden = useCallback(
    (categoryId: string, isHidden: boolean) => {
      if (!preferencesRef.current) return;

      const hiddenCategoryIds = new Set(preferencesRef.current.hidden_category_ids);

      if (isHidden) {
        hiddenCategoryIds.add(categoryId);
      } else {
        hiddenCategoryIds.delete(categoryId);
      }

      savePreferences({
        ...preferencesRef.current,
        hidden_category_ids: [...hiddenCategoryIds],
      });
    },
    [savePreferences]
  );

  const showAllCategories = useCallback(() => {
    if (!preferencesRef.current) return;

    savePreferences({ ...preferencesRef.current, hidden_category_ids: [] });
  }, [savePreferences]);

  const retry = useCallback(() => {
    if (preferencesRef.current) {
      void loadOverview({
        start: preferencesRef.current.period_start,
        end: preferencesRef.current.period_end,
      });
      return;
    }

    void loadPreferences();
  }, [loadOverview, loadPreferences]);

  return {
    preferences,
    overview,
    isLoading,
    isSaving,
    error,
    updateRange,
    resetToCurrentWeek,
    setCategoryBreakdownEnabled,
    setCategoryHidden,
    showAllCategories,
    retry,
  };
}
