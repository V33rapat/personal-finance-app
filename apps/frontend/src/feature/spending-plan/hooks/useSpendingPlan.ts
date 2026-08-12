"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { readApiResponse } from "@/lib/api";
import {
  getSpendingPlanValidationErrors,
  type SpendingPlanFormValues,
  type SpendingPlanStatus,
  type SpendingPlanValidationErrors,
  type SpendingPlanView,
} from "../lib/spendingPlan";

export interface SpendingPlanWallet {
  id: string;
  name: string;
  parent_name: string | null;
  is_available: boolean;
}

export interface SpendingPlanCategory {
  id: string;
  name: string;
  color: string | null;
}

export interface SpendingPlanAllocation {
  date: string;
  amount: string;
}

export interface SpendingPlanPurpose {
  name: string;
  category_ids: string[];
  categories: SpendingPlanCategory[];
  allocations: SpendingPlanAllocation[];
}

export interface SpendingPlanRevision {
  id: string;
  effective_date: string;
  created_at: string;
  wallet_ids: string[];
  purposes: SpendingPlanPurpose[];
}

export interface SpendingPlanDayPurpose {
  name: string;
  planned: string;
  actual: string;
  remaining: string;
  status: "ok" | "warning" | "over" | "planned";
}

export interface SpendingPlanDay {
  date: string;
  planned: string;
  actual: string;
  remaining: string;
  status: "ok" | "warning" | "over" | "planned";
  purposes: SpendingPlanDayPurpose[];
}

export interface SpendingPlanPreferences {
  last_view: SpendingPlanView;
  show_daily_balance: boolean;
  visible_purpose_names: string[];
}

export interface SpendingPlan {
  id: string;
  name: string;
  amount: string;
  start_date: string;
  end_date: string;
  status: SpendingPlanStatus;
  cancelled_at: string | null;
  wallets: SpendingPlanWallet[];
  unavailable_wallet_count: number;
  purpose_count: number;
  current_revision_id: string;
}

export interface SpendingPlanDetail extends SpendingPlan {
  view: {
    month: string;
    calendar_start: string;
    calendar_end: string;
    days: SpendingPlanDay[];
    range_days: SpendingPlanDay[];
  };
  revisions: SpendingPlanRevision[];
  preferences: SpendingPlanPreferences;
}

export interface DashboardSpendingPlan {
  id: string;
  name: string;
  end_date: string;
  days_remaining: number;
  today: SpendingPlanDay | null;
}

interface MutationResult {
  success: boolean;
  validationErrors: SpendingPlanValidationErrors;
  plan?: SpendingPlan;
}

function mapPlan(plan: SpendingPlan): SpendingPlan {
  return {
    ...plan,
    amount: String(plan.amount ?? "0"),
    wallets: Array.isArray(plan.wallets) ? plan.wallets : [],
    unavailable_wallet_count: Number(plan.unavailable_wallet_count ?? 0),
    purpose_count: Number(plan.purpose_count ?? 0),
  };
}

function mapDetail(detail: SpendingPlanDetail): SpendingPlanDetail {
  return {
    ...mapPlan(detail),
    view: {
      ...detail.view,
      days: Array.isArray(detail.view?.days) ? detail.view.days : [],
      range_days: Array.isArray(detail.view?.range_days)
        ? detail.view.range_days
        : [],
    },
    revisions: Array.isArray(detail.revisions) ? detail.revisions : [],
    preferences: detail.preferences ?? {
      last_view: "monthly",
      show_daily_balance: true,
      visible_purpose_names: [],
    },
  };
}

function toPayload(values: SpendingPlanFormValues) {
  return {
    name: values.name.trim(),
    amount: Number(values.amount),
    start_date: values.start_date,
    end_date: values.end_date,
    wallet_ids: values.wallet_ids,
    purposes: values.purposes.map((purpose) => ({
      name: purpose.name.trim(),
      category_ids: purpose.category_ids,
      allocations: purpose.allocations.map((allocation) => ({
        date: allocation.date,
        amount: Number(allocation.amount),
      })),
    })),
  };
}

export function useSpendingPlan(autoLoad = true) {
  const router = useRouter();
  const { showToast } = useToast();
  const detailAbortRef = useRef<AbortController | null>(null);
  const [plans, setPlans] = useState<SpendingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/spending-plan", { cache: "no-store" });
      const data = await readApiResponse<SpendingPlan[]>(response, router);
      setPlans(Array.isArray(data) ? data.map(mapPlan) : []);
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "โหลดแผนการใช้เงินไม่สำเร็จ");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (autoLoad) {
      void loadPlans();
    }
  }, [autoLoad, loadPlans]);

  useEffect(() => () => detailAbortRef.current?.abort(), []);

  const loadPlan = useCallback(
    async (id: string, month?: string) => {
      detailAbortRef.current?.abort();
      const controller = new AbortController();
      detailAbortRef.current = controller;

      try {
        const query = month ? `?month=${encodeURIComponent(month)}` : "";
        const response = await fetch(`/api/spending-plan/${id}${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await readApiResponse<SpendingPlanDetail>(response, router);
        return mapDetail(data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return null;
        }

        setError(requestError instanceof Error ? requestError.message : "โหลดแผนการใช้เงินไม่สำเร็จ");
        return null;
      } finally {
        if (detailAbortRef.current === controller) {
          detailAbortRef.current = null;
        }
      }
    },
    [router],
  );

  const createPlan = useCallback(
    async (values: SpendingPlanFormValues): Promise<MutationResult> => {
      const validationErrors = getSpendingPlanValidationErrors(values);

      if (Object.keys(validationErrors).length || isSaving) {
        return { success: false, validationErrors };
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/spending-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(values)),
        });
        const data = await readApiResponse<SpendingPlan>(response, router);
        const plan = mapPlan(data);
        setPlans((current) => [plan, ...current]);
        showToast({ title: "สร้างแผนการใช้เงินสำเร็จ" });
        return { success: true, validationErrors: {}, plan };
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "สร้างแผนการใช้เงินไม่สำเร็จ";
        setError(message);
        showToast({ title: "สร้างแผนการใช้เงินไม่สำเร็จ", description: message, type: "error" });
        return { success: false, validationErrors: {} };
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, router, showToast],
  );

  const updatePlan = useCallback(
    async (
      id: string,
      effectiveDate: string,
      values: SpendingPlanFormValues,
    ): Promise<MutationResult> => {
      const validationErrors = getSpendingPlanValidationErrors(values);

      if (Object.keys(validationErrors).length || isSaving) {
        return { success: false, validationErrors };
      }

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/spending-plan/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...toPayload(values),
            effective_date: effectiveDate,
          }),
        });
        const data = await readApiResponse<SpendingPlan>(response, router);
        const plan = mapPlan(data);
        setPlans((current) => current.map((item) => (item.id === id ? plan : item)));
        showToast({ title: "บันทึกการแก้ไขแผนสำเร็จ" });
        return { success: true, validationErrors: {}, plan };
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "บันทึกการแก้ไขแผนไม่สำเร็จ";
        setError(message);
        showToast({ title: "บันทึกการแก้ไขแผนไม่สำเร็จ", description: message, type: "error" });
        return { success: false, validationErrors: {} };
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, router, showToast],
  );

  const cancelPlan = useCallback(
    async (id: string) => {
      if (isSaving) {
        return false;
      }

      setIsSaving(true);
      try {
        const response = await fetch(`/api/spending-plan/${id}/cancel`, { method: "POST" });
        const data = await readApiResponse<SpendingPlan>(response, router);
        const plan = mapPlan(data);
        setPlans((current) => current.map((item) => (item.id === id ? plan : item)));
        showToast({ title: "ยกเลิกแผนแล้ว" });
        return true;
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "ยกเลิกแผนไม่สำเร็จ";
        setError(message);
        showToast({ title: "ยกเลิกแผนไม่สำเร็จ", description: message, type: "error" });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, router, showToast],
  );

  const copyPlan = useCallback(
    async (
      id: string,
      values: { name?: string; start_date: string; end_date: string },
    ) => {
      if (isSaving) {
        return null;
      }

      setIsSaving(true);
      try {
        const response = await fetch(`/api/spending-plan/${id}/copy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await readApiResponse<SpendingPlan>(response, router);
        const plan = mapPlan(data);
        setPlans((current) => [plan, ...current]);
        showToast({ title: "คัดลอกแผนสำเร็จ" });
        return plan;
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "คัดลอกแผนไม่สำเร็จ";
        setError(message);
        showToast({ title: "คัดลอกแผนไม่สำเร็จ", description: message, type: "error" });
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, router, showToast],
  );

  const updatePreferences = useCallback(
    async (id: string, preferences: Partial<SpendingPlanPreferences>) => {
      const response = await fetch(`/api/spending-plan/${id}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      return readApiResponse<SpendingPlanPreferences>(response, router);
    },
    [router],
  );

  return {
    plans,
    isLoading,
    isSaving,
    error,
    loadPlans,
    loadPlan,
    createPlan,
    updatePlan,
    cancelPlan,
    copyPlan,
    updatePreferences,
  };
}

export function useDashboardSpendingPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<DashboardSpendingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/spending-plan/dashboard-summary", {
        cache: "no-store",
      });
      const data = await readApiResponse<DashboardSpendingPlan[]>(response, router);
      setPlans(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "โหลดแผนการใช้เงินไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return { plans, isLoading, error, load };
}
