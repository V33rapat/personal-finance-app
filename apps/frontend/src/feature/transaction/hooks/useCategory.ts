"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import type { TransactionType } from "../components/TransactionItem";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface UseCategoryOptions {
  type: TransactionType;
  initialSearch?: string;
  autoLoad?: boolean;
}

interface CreateCategoryInput {
  name: string;
  type: TransactionType;
  color?: string | null;
  icon?: string | null;
}

function normalizeSearch(search: string) {
  return search.trim();
}

function buildCategoryQuery(type: TransactionType, search: string) {
  const params = new URLSearchParams();

  params.set("type", type);
  
  const normalizedSearch = normalizeSearch(search);

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  return params.toString();
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "Category request failed");
  }

  return data;
}

export function useCategory({
  type,
  initialSearch = "",
  autoLoad = true,
}: UseCategoryOptions) {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const queryString = useMemo(() => {
    return buildCategoryQuery(type, search); 
  }, [type, search]);

  const loadCategories = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    
    try{
      const response = await fetch(`/api/category?${queryString}`,{
        signal: controller.signal,
        cache: "no-store",
      });
      
      const data = await readApiResponse(response);

      if(!Array.isArray(data)){
        throw new Error("โหลดหมวดหมู่ไม่สำเร็จ");
      }

      setCategories(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      const message = err instanceof Error ? err.message : "โหลดหมวดหมู่ไม่สำเร็จ";
      setError(message);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [queryString]);

  useEffect(() => {
    if (!autoLoad) return;

    const timeout = setTimeout(() => {
      void loadCategories();
    }, 250);

    return () => clearTimeout(timeout);
  }, [autoLoad, loadCategories]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      const name = normalizeSearch(input.name);

      if (!name){
        setError("กรุณากรอกชื่อหมวดหมู่");
        showToast({ title: "กรุณากรอกชื่อหมวดหมู่", type: "error" });
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch("/api/category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type: input.type ?? type,
            color: input.color ?? null,
            icon: input.icon ?? null,
          }),
        });

        const category = (await readApiResponse(response)) as Category;

        setCategories((current) => {
          const exists = current.find((item) => item.id === category.id);

          if (exists) {
            return current.map((item) =>
              item.id === category.id ? category : item
            );
          }

          if (category.type !== type) {
            return current;
          }
          
          return [category, ...current];
        });

        showToast({ title: "สร้างหมวดหมู่สําเร็จ" });
        return category;
      } catch (err) {
        const message = err instanceof Error ? err.message : "สร้างหมวดหมู่ไม่สําเร็จ";
        setError(message);
        showToast({ title: "สร้างหมวดหมู่ไม่สําเร็จ", description: message, type: "error" });
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [showToast, type]
  );

  const findCategoryByName = useCallback(
    (name: string) => {
      const normalizedName = normalizeSearch(name).toLowerCase();

      return (
        categories.find(
          (category) =>
            category.name.trim().toLowerCase() === normalizedName &&
            category.type === type
        ) ?? null
      );
    },
    [categories, type]
  );

  const deleteCategory = useCallback(
    async (category: Category) => {
      if (category.is_system) {
        const message = "ไม่สามารถลบหมวดหมู่ของระบบได้";
        setError(message);
        showToast({ title: message, type: "error" });
        return false;
      }

      setDeletingCategoryId(category.id);
      setError(null);

      try {
        const response = await fetch(`/api/category/${category.id}`, {
          method: "DELETE",
        });

        await readApiResponse(response);

        setCategories((current) =>
          current.filter((item) => item.id !== category.id)
        );
        showToast({ title: "ลบหมวดหมู่สำเร็จ" });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "ลบหมวดหมู่ไม่สำเร็จ";
        setError(message);
        showToast({
          title: "ลบหมวดหมู่ไม่สำเร็จ",
          description: message,
          type: "error",
        });
        return false;
      } finally {
        setDeletingCategoryId(null);
      }
    },
    [showToast]
  );

  return {
    categories,
    search,
    isLoading,
    isCreating,
    isDeleting: deletingCategoryId !== null,
    deletingCategoryId,
    error,
    
    setSearch,
    loadCategories,
    reloadCategories: loadCategories,
    createCategory,
    deleteCategory,
    findCategoryByName,
  };
}
