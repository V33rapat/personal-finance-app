"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { TH_TEXT } from "@/constants/th";
import { readApiResponse } from "@/lib/api";
import type { TransactionType } from "../components/TransactionItem";

interface ApiTransactionTemplate {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  type: TransactionType;
  default_amount: string | number;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: { id: string; name: string; type?: TransactionType } | null;
}

export interface TransactionTemplate {
  id: string;
  user_id: string;
  category_id: string | null;
  category_name?: string;
  name: string;
  type: TransactionType;
  default_amount: string;
  note: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionTemplateFormValues {
  name: string;
  type: TransactionType;
  default_amount: string;
  category_id: string | null;
  note: string;
}

interface UseTransactionTemplateOptions {
  autoLoad?: boolean;
  type?: TransactionType | "";
}

function mapApiTemplate(template: ApiTransactionTemplate): TransactionTemplate {
  return {
    id: template.id,
    user_id: template.user_id,
    category_id: template.category_id,
    category_name: template.categories?.name,
    name: template.name,
    type: template.type,
    default_amount: String(template.default_amount ?? "0"),
    note: template.note ?? "",
    is_active: template.is_active,
    created_at: template.created_at,
    updated_at: template.updated_at,
  };
}

function toTemplatePayload(values: TransactionTemplateFormValues) {
  return {
    name: values.name.trim(),
    type: values.type,
    default_amount: Number(values.default_amount),
    category_id: values.category_id || null,
    note: values.note.trim() || null,
  };
}

function upsertTemplate(
  templates: TransactionTemplate[],
  template: TransactionTemplate
) {
  const exists = templates.some((item) => item.id === template.id);

  if (!exists) {
    return [template, ...templates];
  }

  return templates.map((item) => (item.id === template.id ? template : item));
}

export function useTransactionTemplate({
  autoLoad = true,
  type = "",
}: UseTransactionTemplateOptions = {}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    if (!type) return templates;

    return templates.filter((template) => template.type === type);
  }, [templates, type]);

  const loadTemplates = useCallback(
    async (nextType: TransactionType | "" = type) => {
      setIsLoading(true);
      setError(null);

      try {
        const query = nextType ? `?type=${nextType}` : "";
        const response = await fetch(`/api/transaction-template${query}`);
        const data = await readApiResponse<ApiTransactionTemplate[]>(
          response,
          router
        );
        const nextTemplates = Array.isArray(data)
          ? data.map(mapApiTemplate)
          : [];

        setTemplates(nextTemplates);
        return nextTemplates;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : TH_TEXT.transactionTemplate.loadFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transactionTemplate.loadFailed,
          description: message,
          type: "error",
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [router, showToast, type]
  );

  const createTemplate = useCallback(
    async (values: TransactionTemplateFormValues) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/transaction-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toTemplatePayload(values)),
        });
        const data = await readApiResponse<ApiTransactionTemplate>(
          response,
          router
        );
        const template = mapApiTemplate(data);

        setTemplates((current) => upsertTemplate(current, template));
        showToast({ title: TH_TEXT.transactionTemplate.createSuccess });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : TH_TEXT.transactionTemplate.createFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transactionTemplate.createFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [router, showToast]
  );

  const updateTemplate = useCallback(
    async (id: string, values: TransactionTemplateFormValues) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/transaction-template/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toTemplatePayload(values)),
        });
        const data = await readApiResponse<ApiTransactionTemplate>(
          response,
          router
        );
        const template = mapApiTemplate(data);

        setTemplates((current) => upsertTemplate(current, template));
        showToast({ title: TH_TEXT.transactionTemplate.updateSuccess });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : TH_TEXT.transactionTemplate.updateFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transactionTemplate.updateFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [router, showToast]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/transaction-template/${id}`, {
          method: "DELETE",
        });

        await readApiResponse<ApiTransactionTemplate>(response, router);
        setTemplates((current) =>
          current.filter((template) => template.id !== id)
        );
        showToast({ title: TH_TEXT.transactionTemplate.deleteSuccess });
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : TH_TEXT.transactionTemplate.deleteFailed;

        setError(message);
        showToast({
          title: TH_TEXT.transactionTemplate.deleteFailed,
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [router, showToast]
  );

  useEffect(() => {
    if (!autoLoad) return;

    void loadTemplates(type);
  }, [autoLoad, loadTemplates, type]);

  return {
    templates: filteredTemplates,
    allTemplates: templates,
    isLoading,
    isSaving,
    error,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    reload: loadTemplates,
  };
}
