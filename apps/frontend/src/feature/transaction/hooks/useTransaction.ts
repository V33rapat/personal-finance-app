"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Transaction, TransactionType } from "../components/TransactionItem";

const USER_ID = "49f2f260-9354-4f2b-a595-f947d299858b";

const now = new Date();

interface UserTransactionOptions {
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
  amount: string;
  note: string;
  transaction_date: string;
  created_at: string;
  categories?: { name: string } | null;
  wallets?: { name: string } | null;
}

const temporaryCategories: TransactionCategory[] = [
  { id: "cat-1", name: "เงินเดือน", type: "income" },
  { id: "cat-2", name: "โอนเงิน", type: "income" },
  { id: "cat-3", name: "อื่นๆ (รายรับ)", type: "income" },
  { id: "cat-4", name: "อาหาร", type: "expense" },
  { id: "cat-5", name: "เดินทาง", type: "expense" },
  { id: "cat-6", name: "ช็อปปิ้ง", type: "expense" },
  { id: "cat-7", name: "บันเทิง", type: "expense" },
  { id: "cat-8", name: "สุขภาพ", type: "expense" },
  { id: "cat-9", name: "การศึกษา", type: "expense" },
  { id: "cat-10", name: "ท่องเที่ยว", type: "expense" },
  { id: "cat-11", name: "อื่นๆ (รายจ่าย)", type: "expense" },
];

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
    note: transaction.note,
    transaction_date: transaction.transaction_date.split("T")[0],
    created_at: transaction.created_at,
  };
}

export function useTransaction(options: UserTransactionOptions = {}) {
  const { walletId, autoLoad = true } = options;
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories] = useState<TransactionCategory[]>(temporaryCategories); 
  
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
  const pageSize = 10;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveWalletId = walletId ?? filters.walletId;
  
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const query = effectiveWalletId ? `?walletId=${effectiveWalletId}` : "";
      const res = await fetch(`/api/transaction${query}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? "โหลดรายการไม่สำเร็จ");
      }

      setTransactions(data.map(mapApiTransaction));
      setPage(1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "โหลดรายการไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveWalletId]);

  useEffect(() => {
    if (!autoLoad) return;
    void loadTransactions();
  }, [autoLoad, loadTransactions]);
  
  const filteredTransactions = useMemo(() => {
    let filtered = {...transactions};

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
    key: Key, value: TransactionFilters[Key]
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

  const openModal = (walletId?: string) => {
    setCurrentWalletId(walletId ?? null);
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
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
      return;
    }

    const payload = {
      wallet_id: targetWalletId,
      name: values.name.trim(),
      amount: Number(values.amount),
      type: values.type,
      category_id: values.category_id || undefined,
      transaction_date: values.transaction_date,
      note: values.note.trim() || undefined,
    };

    const res = await fetch ("/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "เพิ่มรายการไม่สําเร็จ");
      return;
    }

    setTransactions((current) => [mapApiTransaction(data), ...current]);
    closeModal();
  };

  const updateTransaction = async (values: TransactionFormValues) => {
    if (!editingTransaction) return;

    const payload = {
      name: values.name.trim(),
      amount: Number(values.amount),
      type: values.type,
      category_id: values.category_id || null,
      transaction_date: values.transaction_date,
      note: values.note.trim() || null,
    }

    const rest = await fetch (`/api/transaction/${editingTransaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await rest.json();

    if (!rest.ok) {
      setError(data.message ?? "แก้ไขรายการไม่สําเร็จ");
      return;
    }

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === editingTransaction.id ? mapApiTransaction(data) : transaction
      )
    );

    closeModal();
  };

  const deleteTransactions = async (ids: string[]) => {
    const results = await Promise.all(
      ids.map((id) => fetch(`/api/transaction/${id}`, { method: "DELETE" }))
    );

    const failed = results.find((res) => !res.ok);

    if (failed) {
      const data = await failed.json();
      setError(data.message ?? "ลบรายการไม่สําเร็จ");
      return;
    }

    setTransactions((current) => 
      current.filter((transaction) => !ids.includes(transaction.id))
    );
  };

  return {
    transactions: filteredTransactions,
    displayedTransactions,
    hasMore,
    isLoading,
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