"use client";

import { useMemo, useState } from "react";
import type { Transaction, TransactionType } from "../components/TransactionItem";

const USER_ID = "49f2f260-9354-4f2b-a595-f947d299858b";

const now = new Date();

const mockTransactions: Transaction[] = [
  {
    id: "tx-1",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-1",
    category_name: "เงินเดือน",
    name: "เงินเดือน",
    type: "income",
    amount: "25000",
    note: null,
    transaction_date: "2026-05-01",
    created_at: now.toISOString(),
  },
  {
    id: "tx-2",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-2",
    category_name: "อาหาร",
    name: "ค่าอาหารกลางวัน",
    type: "expense",
    amount: "150",
    note: "ร้านข้าวแกง",
    transaction_date: "2026-05-02",
    created_at: now.toISOString(),
  },
  {
    id: "tx-3",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-3",
    category_name: "เดินทาง",
    name: "ค่ารถไฟฟ้า",
    type: "expense",
    amount: "80",
    note: null,
    transaction_date: "2026-05-02",
    created_at: now.toISOString(),
  },
  {
    id: "tx-4",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-4",
    category_name: "ช็อปปิ้ง",
    name: "ซื้อเสื้อ",
    type: "expense",
    amount: "450",
    note: "ร้านแม่ช้อน",
    transaction_date: "2026-05-03",
    created_at: now.toISOString(),
  },
  {
    id: "tx-5",
    wallet_id: "wallet-travel",
    wallet_name: "ท่องเที่ยว",
    category_id: "cat-5",
    category_name: "ท่องเที่ยว",
    name: "จองโรงแรม",
    type: "expense",
    amount: "2500",
    note: "ภูเก็ต 3 คืน",
    transaction_date: "2026-04-28",
    created_at: now.toISOString(),
  },
  {
    id: "tx-6",
    wallet_id: "wallet-emergency",
    wallet_name: "ฉุกเฉิน",
    category_id: "cat-6",
    category_name: "อื่นๆ",
    name: "ค่าหมอ",
    type: "expense",
    amount: "500",
    note: "ตรวจสุขภาพประจำปี",
    transaction_date: "2026-04-20",
    created_at: now.toISOString(),
  },
  {
    id: "tx-7",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-4",
    category_name: "อาหาร",
    name: "ค่าข้าวร้าน",
    type: "expense",
    amount: "200",
    note: null,
    transaction_date: "2026-04-19",
    created_at: now.toISOString(),
  },
  {
    id: "tx-8",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-4",
    category_name: "อาหาร",
    name: "ค่ากาแฟ",
    type: "expense",
    amount: "65",
    note: "Starbucks",
    transaction_date: "2026-04-18",
    created_at: now.toISOString(),
  },
  {
    id: "tx-9",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-7",
    category_name: "บันเทิง",
    name: "ค่าหนัง",
    type: "expense",
    amount: "220",
    note: "ดูหนังกับเพื่อน",
    transaction_date: "2026-04-17",
    created_at: now.toISOString(),
  },
  {
    id: "tx-10",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-8",
    category_name: "สุขภาพ",
    name: "ค่ายา",
    type: "expense",
    amount: "150",
    note: null,
    transaction_date: "2026-04-16",
    created_at: now.toISOString(),
  },
  {
    id: "tx-11",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-1",
    category_name: "โอนเงิน",
    name: "โอนให้แม่",
    type: "expense",
    amount: "3000",
    note: null,
    transaction_date: "2026-04-15",
    created_at: now.toISOString(),
  },
  {
    id: "tx-12",
    wallet_id: "wallet-investment",
    wallet_name: "ลงทุน",
    category_id: "cat-10",
    category_name: "ลงทุน",
    name: "ซื้อหุ้น",
    type: "expense",
    amount: "10000",
    note: "กองทุน LTF",
    transaction_date: "2026-04-14",
    created_at: now.toISOString(),
  },
  {
    id: "tx-13",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-2",
    category_name: "อาหาร",
    name: "ซื้อของกิน",
    type: "expense",
    amount: "350",
    note: "ซื้อของเข้าบ้าน",
    transaction_date: "2026-04-13",
    created_at: now.toISOString(),
  },
  {
    id: "tx-14",
    wallet_id: "wallet-travel",
    wallet_name: "ท่องเที่ยว",
    category_id: "cat-5",
    category_name: "ท่องเที่ยว",
    name: "ค่าเครื่องบิน",
    type: "expense",
    amount: "3500",
    note: "เที่ยวเชียงใหม่",
    transaction_date: "2026-04-12",
    created_at: now.toISOString(),
  },
  {
    id: "tx-15",
    wallet_id: "wallet-savings",
    wallet_name: "เงินออม",
    category_id: "cat-9",
    category_name: "การศึกษา",
    name: "ค่าหนังสือ",
    type: "expense",
    amount: "480",
    note: null,
    transaction_date: "2026-04-11",
    created_at: now.toISOString(),
  },
];

const mockCategories = [
  { id: "cat-1", name: "เงินเดือน", type: "income" as TransactionType },
  { id: "cat-2", name: "โอนเงิน", type: "income" as TransactionType },
  { id: "cat-3", name: "อื่นๆ (รายรับ)", type: "income" as TransactionType },
  { id: "cat-4", name: "อาหาร", type: "expense" as TransactionType },
  { id: "cat-5", name: "เดินทาง", type: "expense" as TransactionType },
  { id: "cat-6", name: "ช็อปปิ้ง", type: "expense" as TransactionType },
  { id: "cat-7", name: "บันเทิง", type: "expense" as TransactionType },
  { id: "cat-8", name: "สุขภาพ", type: "expense" as TransactionType },
  { id: "cat-9", name: "การศึกษา", type: "expense" as TransactionType },
  { id: "cat-10", name: "ท่องเที่ยว", type: "expense" as TransactionType },
  { id: "cat-11", name: "อื่นๆ (รายจ่าย)", type: "expense" as TransactionType },
];

interface TransactionFormValues {
  name: string;
  amount: string;
  type: TransactionType;
  category_id: string | null;
  transaction_date: string;
  note: string;
}

function createId() {
  return `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface TransactionFilters {
  type: TransactionType | "";
  categoryId: string;
  startDate: string;
  endDate: string;
  searchQuery: string;
}

export function useTransaction(walletId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentWalletId, setCurrentWalletId] = useState<string | undefined>(walletId);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    searchQuery: "",
  });

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (walletId) {
      filtered = filtered.filter((t) => t.wallet_id === walletId);
    }

    if (filters.type) {
      filtered = filtered.filter((t) => t.type === filters.type);
    }

    if (filters.categoryId) {
      filtered = filtered.filter((t) => t.category_id === filters.categoryId);
    }

    if (filters.startDate) {
      filtered = filtered.filter((t) => t.transaction_date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((t) => t.transaction_date <= filters.endDate);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(query) || (t.note && t.note.toLowerCase().includes(query))
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [transactions, walletId, filters]);

  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, page * pageSize);
  }, [filteredTransactions, page]);

  const hasMore = displayedTransactions.length < filteredTransactions.length;

  const updateFilter = <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      categoryId: "",
      startDate: "",
      endDate: "",
      searchQuery: "",
    });
    setPage(1);
  };

  const loadMore = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setPage((current) => current + 1);
      setIsLoading(false);
    }, 500);
  };

  const categories = useMemo(() => mockCategories, []);

  const openModal = (walletId?: string) => {
    setCurrentWalletId(walletId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const addTransaction = (values: TransactionFormValues) => {
    const wallet = transactions.find((t) => t.wallet_id === (walletId ?? currentWalletId));

    const newTransaction: Transaction = {
      id: createId(),
      wallet_id: walletId ?? currentWalletId ?? "wallet-savings",
      wallet_name: wallet?.wallet_name,
      category_id: values.category_id,
      category_name: mockCategories.find((c) => c.id === values.category_id)?.name,
      name: values.name.trim(),
      type: values.type,
      amount: values.amount,
      note: values.note.trim() || null,
      transaction_date: values.transaction_date,
      created_at: new Date().toISOString(),
    };

    setTransactions((current) => [newTransaction, ...current]);
    closeModal();
  };

  return {
    transactions: filteredTransactions,
    displayedTransactions,
    hasMore,
    isLoading,
    categories,
    filters,
    modalOpen,
    currentWalletId,
    openModal,
    closeModal,
    addTransaction,
    loadMore,
    updateFilter,
    clearFilters,
  };
}

export function useTransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filters, setFilters] = useState({
    walletId: "",
    type: "" as TransactionType | "",
    categoryId: "",
    startDate: "",
    endDate: "",
    searchQuery: "",
  });
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filters.walletId) {
      filtered = filtered.filter((t) => t.wallet_id === filters.walletId);
    }

    if (filters.type) {
      filtered = filtered.filter((t) => t.type === filters.type);
    }

    if (filters.categoryId) {
      filtered = filtered.filter((t) => t.category_id === filters.categoryId);
    }

    if (filters.startDate) {
      filtered = filtered.filter((t) => t.transaction_date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((t) => t.transaction_date <= filters.endDate);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(query) || (t.note && t.note.toLowerCase().includes(query))
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [transactions, filters]);

  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, page * pageSize);
  }, [filteredTransactions, page]);

  const categories = useMemo(() => mockCategories, []);

  const loadMore = () => {
    if (isLoading) return;

    setIsLoading(true);
    setTimeout(() => {
      setPage((current) => current + 1);
      setIsLoading(false);
    }, 500);
  };

  useMemo(() => {
    setHasMore(displayedTransactions.length < filteredTransactions.length);
  }, [displayedTransactions, filteredTransactions]);

  const updateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
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

  return {
    transactions: displayedTransactions,
    filteredTransactions,
    categories,
    filters,
    hasMore,
    isLoading,
    updateFilter,
    clearFilters,
    loadMore,
  };
}