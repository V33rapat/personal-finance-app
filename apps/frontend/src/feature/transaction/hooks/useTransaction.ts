"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import type { Transaction, TransactionType } from "../components/TransactionItem";

interface UseTransactionOptions {
  walletId?: string | null;
  autoLoad?: boolean;
}

interface TransactionFormValues {
  name: string;
  amount: string;
  type: TransactionType;
  category_id: string | null;
  transaction_date: string;
  note: string;
}

interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
}

interface TransactionFilters {
  walletId: string;
  type: TransactionType | "";
  categoryId: string;
  startDate: string;
  endDate: string;
  searchQuery: string;
}

interface ApiTransaction {
  id: string;
  wallet_id: string;
  category_id: string | null;
  name: string;
  type: TransactionType;
  amount: string | number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  categories?: { id: string; name: string; type?: TransactionType } | null;
  wallets?: { name: string } | null;
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed");
  }

  return data;
}

function mapApiTransaction(transaction: ApiTransaction): Transaction {
  return {
    id: transaction.id,
    wallet_id: transaction.wallet_id,
    wallet_name: transaction.wallets?.name,
    category_id: transaction.category_id,
    category_name: transaction.categories?.name,
    name: transaction.name,
    type: transaction.type,
    amount: String(transaction.amount),
    note: transaction.note ?? "",
    transaction_date: transaction.transaction_date.split("T")[0],
    created_at: transaction.created_at,
  };
}

function getCategoryOptions(transactions: Transaction[]): TransactionCategory[] {
  const categoryMap = new Map<string, TransactionCategory>();

  transactions.forEach((transaction) => {
    if (!transaction.category_id || !transaction.category_name) return;

    categoryMap.set(transaction.category_id, {
      id: transaction.category_id,
      name: transaction.category_name,
      type: transaction.type,
    });
  });

  return Array.from(categoryMap.values());
}

export function useTransaction(options: UseTransactionOptions = {}) {
  const { walletId, autoLoad = true } = options;
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({
    walletId: "",
    type: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    searchQuery: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(walletId ?? null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 10;
  const effectiveWalletId = walletId ?? filters.walletId;
  const categories = useMemo(() => getCategoryOptions(transactions), [transactions]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const query = effectiveWalletId ? `?walletId=${effectiveWalletId}` : "";
      const response = await fetch(`/api/transaction${query}`);
      const data = await readApiResponse(response);

      if (!Array.isArray(data)) {
        throw new Error(data?.message ?? "โหลดรายการไม่สำเร็จ");
      }

      setTransactions(data.map(mapApiTransaction));
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveWalletId]);

  useEffect(() => {
    if (!autoLoad) return;
    void loadTransactions();
  }, [autoLoad, loadTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter((transaction) => transaction.type === filters.type);
    }

    if (filters.categoryId) {
      filtered = filtered.filter((transaction) => transaction.category_id === filters.categoryId);
    }

    if (filters.startDate) {
      filtered = filtered.filter((transaction) => transaction.transaction_date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((transaction) => transaction.transaction_date <= filters.endDate);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          transaction.name.toLowerCase().includes(query) ||
          (transaction.note && transaction.note.toLowerCase().includes(query))
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [transactions, filters]);

  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, page * pageSize);
  }, [filteredTransactions, page]);

  const hasMore = displayedTransactions.length < filteredTransactions.length;

  const updateFilter = <Key extends keyof TransactionFilters>(
    key: Key,
    value: TransactionFilters[Key]
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      walletId: "",
      type: "",
      categoryId: "",
      startDate: "",
      endDate: "",
      searchQuery: "",
    });
    setPage(1);
  };

  const loadMore = () => {
    if (isLoading || !hasMore) return;
    setPage((current) => current + 1);
  };

  const openModal = (nextWalletId?: string) => {
    setError("");
    setCurrentWalletId(nextWalletId ?? null);
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setError("");
    setCurrentWalletId(transaction.wallet_id);
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
  };

  const addTransaction = async (values: TransactionFormValues) => {
    const targetWalletId = walletId ?? currentWalletId ?? filters.walletId;

    if (!targetWalletId) {
      setError("กรุณาเลือกกระเป๋าเงินก่อนเพิ่มรายการ");
      return false;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: targetWalletId,
          name: values.name.trim(),
          amount: Number(values.amount),
          type: values.type,
          category_id: values.category_id || null,
          transaction_date: values.transaction_date,
          note: values.note.trim() || null,
        }),
      });
      const data = await readApiResponse(response);

      setTransactions((current) => [mapApiTransaction(data), ...current]);
      closeModal();
      showToast({ title: "สร้างรายการสำเร็จ" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "เพิ่มรายการไม่สำเร็จ";
      setError(message);
      showToast({ title: "เพิ่มรายการไม่สำเร็จ", description: message, type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateTransaction = async (values: TransactionFormValues) => {
    if (!editingTransaction) return false;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/transaction/${editingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          amount: Number(values.amount),
          type: values.type,
          category_id: values.category_id || null,
          transaction_date: values.transaction_date,
          note: values.note.trim() || null,
        }),
      });
      const data = await readApiResponse(response);

      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === editingTransaction.id ? mapApiTransaction(data) : transaction
        )
      );

      closeModal();
      showToast({ title: "แก้ไขรายการสำเร็จ" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "แก้ไขรายการไม่สำเร็จ";
      setError(message);
      showToast({ title: "แก้ไขรายการไม่สำเร็จ", description: message, type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTransactions = async (ids: string[]) => {
    if (ids.length === 0) return false;

    setIsSaving(true);
    setError("");

    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/transaction/${id}`, { method: "DELETE" }))
      );
      const failed = results.find((response) => !response.ok);

      if (failed) {
        await readApiResponse(failed);
      }

      setTransactions((current) =>
        current.filter((transaction) => !ids.includes(transaction.id))
      );
      showToast({ title: "ลบรายการสำเร็จ" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "ลบรายการไม่สำเร็จ";
      setError(message);
      showToast({ title: "ลบรายการไม่สำเร็จ", description: message, type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    transactions: filteredTransactions,
    displayedTransactions,
    hasMore,
    isLoading,
    isSaving,
    error,
    categories,
    filters,
    modalOpen,
    editingTransaction,
    currentWalletId,

    loadTransactions,
    reload: loadTransactions,
    loadMore,

    updateFilter,
    clearFilters,

    openModal,
    openEditModal,
    closeModal,

    addTransaction,
    updateTransaction,
    deleteTransactions,
  };
}
