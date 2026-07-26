"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";
import { readApiResponse } from "@/lib/api";
import { getBangkokToday } from "../lib/date";
import {
  getDefaultSpendingBudgetPeriodSelections,
  getSpendingBudgetOverviewSearchParams,
  getSpendingBudgetValidationErrors,
  type SpendingBudgetFormValues,
  type SpendingBudgetPeriod,
  type SpendingBudgetPeriodSelection,
  type SpendingBudgetPeriodSelections,
  type SpendingBudgetStatus,
} from "../lib/spendingBudget";

interface ApiBudgetCategory {
  id: string;
  name: string;
  color: string | null;
}

interface ApiSpendingBudget {
  id: string;
  name: string;
  amount: string | number;
  period: SpendingBudgetPeriod;
  includes_uncategorized: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories: ApiBudgetCategory[];
}

interface ApiSpendingBudgetOverview {
  period: SpendingBudgetPeriod;
  period_start: string;
  period_end: string;
  budgets: Array<
    ApiSpendingBudget & {
      spent: string | number;
      remaining: string | number;
      percentage: number;
      status: SpendingBudgetStatus;
    }
  >;
}

export type SpendingBudgetCategory = ApiBudgetCategory;

export interface SpendingBudget {
  id: string;
  name: string;
  amount: string;
  period: SpendingBudgetPeriod;
  includes_uncategorized: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories: SpendingBudgetCategory[];
}

export interface SpendingBudgetOverview extends SpendingBudget {
  spent: string;
  remaining: string;
  percentage: number;
  status: SpendingBudgetStatus;
}

export interface SpendingBudgetOverviewResponse {
  period: SpendingBudgetPeriod;
  period_start: string;
  period_end: string;
  budgets: SpendingBudgetOverview[];
}

function mapBudget(budget: ApiSpendingBudget): SpendingBudget {
  return {
    id: budget.id,
    name: budget.name,
    amount: String(budget.amount ?? "0"),
    period: budget.period,
    includes_uncategorized: budget.includes_uncategorized,
    is_active: budget.is_active,
    created_at: budget.created_at,
    updated_at: budget.updated_at,
    categories: Array.isArray(budget.categories) ? budget.categories : [],
  };
}

function mapOverview(
  response: ApiSpendingBudgetOverview,
): SpendingBudgetOverviewResponse {
  return {
    period: response.period,
    period_start: response.period_start,
    period_end: response.period_end,
    budgets: Array.isArray(response.budgets)
      ? response.budgets.map((budget) => ({
          ...mapBudget(budget),
          spent: String(budget.spent ?? "0"),
          remaining: String(budget.remaining ?? "0"),
          percentage: Number.isFinite(Number(budget.percentage))
            ? Number(budget.percentage)
            : 0,
          status: budget.status,
        }))
      : [],
  };
}

function toPayload(values: SpendingBudgetFormValues) {
  return {
    name: values.name.trim(),
    amount: Number(values.amount),
    period: values.period,
    category_ids: values.category_ids,
    includes_uncategorized: values.includes_uncategorized,
  };
}

export function useSpendingBudget() {
  const router = useRouter();
  const { showToast } = useToast();
  const overviewAbortControllerRef = useRef<AbortController | null>(null);
  const [selectedPeriod, setSelectedPeriod] =
    useState<SpendingBudgetPeriod>("daily");
  const [periodSelections, setPeriodSelections] =
    useState<SpendingBudgetPeriodSelections>(() =>
      getDefaultSpendingBudgetPeriodSelections(getBangkokToday()),
    );
  const [budgets, setBudgets] = useState<SpendingBudget[]>([]);
  const [overview, setOverview] =
    useState<SpendingBudgetOverviewResponse | null>(null);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    setIsLoadingBudgets(true);

    try {
      const response = await fetch("/api/spending-budget", {
        cache: "no-store",
      });
      const data = await readApiResponse<ApiSpendingBudget[]>(response, router);
      setBudgets(Array.isArray(data) ? data.map(mapBudget) : []);
      return true;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : TH_TEXT.budget.loadFailed;

      setError(message);
      return false;
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [router]);

  const loadOverview = useCallback(
    async (selection: SpendingBudgetPeriodSelection) => {
      overviewAbortControllerRef.current?.abort();

      const controller = new AbortController();
      overviewAbortControllerRef.current = controller;
      setIsLoadingOverview(true);
      setError(null);
      setOverview(null);

      try {
        const query = getSpendingBudgetOverviewSearchParams(selection);
        const response = await fetch(
          `/api/spending-budget/overview?${query.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readApiResponse<ApiSpendingBudgetOverview>(
          response,
          router,
        );

        if (overviewAbortControllerRef.current === controller) {
          setOverview(mapOverview(data));
        }
        return true;
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return false;
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : TH_TEXT.budget.loadFailed;

        if (overviewAbortControllerRef.current === controller) {
          setError(message);
        }
        return false;
      } finally {
        if (overviewAbortControllerRef.current === controller) {
          setIsLoadingOverview(false);
          overviewAbortControllerRef.current = null;
        }
      }
    },
    [router],
  );

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  useEffect(() => {
    void loadOverview(periodSelections[selectedPeriod]);
  }, [loadOverview, periodSelections, selectedPeriod]);

  useEffect(() => {
    return () => overviewAbortControllerRef.current?.abort();
  }, []);

  const reload = useCallback(async () => {
    const results = await Promise.all([
      loadBudgets(),
      loadOverview(periodSelections[selectedPeriod]),
    ]);
    return results.every(Boolean);
  }, [loadBudgets, loadOverview, periodSelections, selectedPeriod]);

  const refreshOverview = useCallback(async () => {
    await loadOverview(periodSelections[selectedPeriod]);
  }, [loadOverview, periodSelections, selectedPeriod]);

  const setPeriodSelection = useCallback(
    (selection: SpendingBudgetPeriodSelection) => {
      setPeriodSelections((current) => ({
        ...current,
        [selection.period]: selection,
      }));
    },
    [],
  );

  const resetPeriodSelection = useCallback((period: SpendingBudgetPeriod) => {
    const defaults =
      getDefaultSpendingBudgetPeriodSelections(getBangkokToday());

    setPeriodSelections((current) => ({
      ...current,
      [period]: defaults[period],
    }));
  }, []);

  const createBudget = useCallback(
    async (values: SpendingBudgetFormValues) => {
      const validationErrors = getSpendingBudgetValidationErrors(values);

      if (Object.keys(validationErrors).length > 0 || isSaving) {
        return { success: false, validationErrors };
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/spending-budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(values)),
        });
        const data = await readApiResponse<ApiSpendingBudget>(response, router);
        const budget = mapBudget(data);

        setBudgets((current) => [...current, budget]);
        await refreshOverview();
        showToast({ title: TH_TEXT.budget.createSuccess });
        return { success: true, validationErrors: {} };
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : TH_TEXT.budget.createFailed;

        setError(message);
        showToast({
          title: TH_TEXT.budget.createFailed,
          description: message,
          type: "error",
        });
        return { success: false, validationErrors: {} };
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, refreshOverview, router, showToast],
  );

  const updateBudget = useCallback(
    async (id: string, values: SpendingBudgetFormValues) => {
      const validationErrors = getSpendingBudgetValidationErrors(values);

      if (Object.keys(validationErrors).length > 0 || isSaving) {
        return { success: false, validationErrors };
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/spending-budget/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(values)),
        });
        const data = await readApiResponse<ApiSpendingBudget>(response, router);
        const budget = mapBudget(data);

        setBudgets((current) =>
          current.map((currentBudget) =>
            currentBudget.id === id ? budget : currentBudget,
          ),
        );
        await refreshOverview();
        showToast({ title: TH_TEXT.budget.updateSuccess });
        return { success: true, validationErrors: {} };
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : TH_TEXT.budget.updateFailed;

        setError(message);
        showToast({
          title: TH_TEXT.budget.updateFailed,
          description: message,
          type: "error",
        });
        return { success: false, validationErrors: {} };
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, refreshOverview, router, showToast],
  );

  const setBudgetActive = useCallback(
    async (budget: SpendingBudget, isActive: boolean) => {
      if (isSaving) {
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/spending-budget/${budget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: isActive }),
        });
        const data = await readApiResponse<ApiSpendingBudget>(response, router);
        const updatedBudget = mapBudget(data);

        setBudgets((current) =>
          current.map((currentBudget) =>
            currentBudget.id === budget.id ? updatedBudget : currentBudget,
          ),
        );
        await refreshOverview();
        showToast({
          title: isActive
            ? TH_TEXT.budget.resumeSuccess
            : TH_TEXT.budget.pauseSuccess,
        });
        return true;
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : TH_TEXT.budget.updateFailed;

        setError(message);
        showToast({
          title: TH_TEXT.budget.updateFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, refreshOverview, router, showToast],
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      if (isSaving) {
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/spending-budget/${id}`, {
          method: "DELETE",
        });
        await readApiResponse<{ id: string }>(response, router);

        setBudgets((current) => current.filter((budget) => budget.id !== id));
        await refreshOverview();
        showToast({ title: TH_TEXT.budget.deleteSuccess });
        return true;
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : TH_TEXT.budget.deleteFailed;

        setError(message);
        showToast({
          title: TH_TEXT.budget.deleteFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, refreshOverview, router, showToast],
  );

  return {
    selectedPeriod,
    selectedPeriodSelection: periodSelections[selectedPeriod],
    budgets,
    overview,
    isLoading: isLoadingBudgets || isLoadingOverview,
    isLoadingBudgets,
    isLoadingOverview,
    isSaving,
    error,
    setSelectedPeriod,
    setPeriodSelection,
    resetPeriodSelection,
    loadBudgets,
    loadOverview,
    createBudget,
    updateBudget,
    setBudgetActive,
    deleteBudget,
    reload,
  };
}
