"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api";
import type { Category } from "@/feature/transaction/hooks/useCategory";
import type { Transaction, TransactionType } from "@/feature/transaction/components/TransactionItem";

export type TransactionManagement = "manual" | "transfer" | "allocation";

export interface WalletDailyTransaction extends Transaction {
  management: TransactionManagement;
}

export interface DailyTransactionSummary {
  income: string;
  expense: string;
  net: string;
}

export interface DailyTransactionFilters {
  type: TransactionType | "";
  categoryId: string;
  searchQuery: string;
}

interface ApiDailyTransaction {
  id: string;
  wallet_id: string;
  category_id: string | null;
  template_id: string | null;
  name: string;
  type: TransactionType;
  amount: string | number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  management: TransactionManagement;
  categories?: { id: string; name: string } | null;
  wallets?: { name: string } | null;
}

interface DailyTransactionsResponse {
  date: string;
  summary: DailyTransactionSummary;
  items: ApiDailyTransaction[];
  page: number;
  has_more: boolean;
}

const EMPTY_SUMMARY: DailyTransactionSummary = {
  income: "0",
  expense: "0",
  net: "0",
};

function mapDailyTransaction(transaction: ApiDailyTransaction): WalletDailyTransaction {
  return {
    id: transaction.id,
    wallet_id: transaction.wallet_id,
    wallet_name: transaction.wallets?.name,
    category_id: transaction.category_id,
    template_id: transaction.template_id,
    category_name: transaction.categories?.name,
    name: transaction.name,
    type: transaction.type,
    amount: String(transaction.amount),
    note: transaction.note,
    transaction_date: transaction.transaction_date.slice(0, 10),
    created_at: transaction.created_at,
    management: transaction.management,
  };
}

function buildQuery(
  walletId: string,
  date: string,
  filters: DailyTransactionFilters,
  page: number
) {
  const params = new URLSearchParams({ walletId, date, page: String(page) });

  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.searchQuery.trim()) params.set("search", filters.searchQuery.trim());

  return params.toString();
}

export function useWalletDailyTransactions(walletId: string | null, date: string) {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [items, setItems] = useState<WalletDailyTransaction[]>([]);
  const [summary, setSummary] = useState<DailyTransactionSummary>(EMPTY_SUMMARY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<DailyTransactionFilters>({
    type: "",
    categoryId: "",
    searchQuery: "",
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/category", { cache: "no-store" });
      const data = await readApiResponse<Category[]>(response, router);

      setCategories(Array.isArray(data) ? data : []);
    } catch (nextError) {
      if (nextError instanceof Error && nextError.name === "AbortError") return;
    }
  }, [router]);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!walletId) {
        setItems([]);
        setSummary(EMPTY_SUMMARY);
        setHasMore(false);
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = ++requestIdRef.current;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(
          `/api/transaction/daily?${buildQuery(walletId, date, filters, nextPage)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const data = await readApiResponse<DailyTransactionsResponse>(response, router);

        if (requestId !== requestIdRef.current) return;

        const nextItems = data.items.map(mapDailyTransaction);
        setItems((current) => (append ? [...current, ...nextItems] : nextItems));
        setSummary(data.summary ?? EMPTY_SUMMARY);
        setPage(data.page);
        setHasMore(data.has_more);
      } catch (nextError) {
        if (nextError instanceof DOMException && nextError.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;

        setError(nextError instanceof Error ? nextError.message : "โหลดรายการไม่สำเร็จ");
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [date, filters, router, walletId]
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const updateFilter = useCallback(
    <Key extends keyof DailyTransactionFilters>(key: Key, value: DailyTransactionFilters[Key]) => {
      setFilters((current) => {
        const next = { ...current, [key]: value };

        if (key === "type" && current.categoryId) {
          const selectedCategory = categories.find((category) => category.id === current.categoryId);
          if (selectedCategory && value && selectedCategory.type !== value) {
            next.categoryId = "";
          }
        }

        return next;
      });
    },
    [categories]
  );

  const availableCategories = useMemo(
    () => categories.filter((category) => !filters.type || category.type === filters.type),
    [categories, filters.type]
  );

  const reload = useCallback(() => {
    void loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    void loadPage(page + 1, true);
  }, [hasMore, isLoading, isLoadingMore, loadPage, page]);

  return {
    items,
    summary,
    categories: availableCategories,
    filters,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    updateFilter,
    loadMore,
    reload,
  };
}
