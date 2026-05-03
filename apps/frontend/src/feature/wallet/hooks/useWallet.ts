"use client";

import { useMemo, useState } from "react";

export type WalletType = "normal" | "investment";

export interface Wallet {
  id: string;
  user_id: string;
  parent_wallet_id: string | null;
  name: string;
  description: string | null;
  wallet_type: WalletType;
  balance: string;
  currency: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WalletNode extends Wallet {
  children: WalletNode[];
}

export interface WalletFormValues {
  name: string;
  description: string;
  wallet_type: WalletType;
  parent_wallet_id: string | null;
  color: string;
  icon: string;
}

type ModalMode = "create" | "edit";

interface WalletModalState {
  isOpen: boolean;
  mode: ModalMode;
  wallet: Wallet | null;
  parentId: string | null;
}

const USER_ID = "49f2f260-9354-4f2b-a595-f947d299858b";

const now = "2026-05-03T00:00:00.000Z";

const mockWallets: Wallet[] = [
  {
    id: "wallet-savings",
    user_id: USER_ID,
    parent_wallet_id: null,
    name: "Savings",
    description: "Long-term savings and reserve funds.",
    wallet_type: "normal",
    balance: "52000",
    currency: "THB",
    color: "#7c3aed",
    icon: "piggy",
    sort_order: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
  {
    id: "wallet-travel",
    user_id: USER_ID,
    parent_wallet_id: "wallet-savings",
    name: "Travel",
    description: "Trips, hotels, and travel spending.",
    wallet_type: "normal",
    balance: "12500",
    currency: "THB",
    color: "#2563eb",
    icon: "plane",
    sort_order: 1,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
  {
    id: "wallet-emergency",
    user_id: USER_ID,
    parent_wallet_id: "wallet-savings",
    name: "Emergency",
    description: "Money kept aside for unexpected expenses.",
    wallet_type: "normal",
    balance: "39500",
    currency: "THB",
    color: "#059669",
    icon: "shield",
    sort_order: 2,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
  {
    id: "wallet-investment",
    user_id: USER_ID,
    parent_wallet_id: null,
    name: "Investment",
    description: "Portfolio cash and investment tracking.",
    wallet_type: "investment",
    balance: "84500",
    currency: "THB",
    color: "#db2777",
    icon: "chart",
    sort_order: 3,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
];

function buildWalletTree(wallets: Wallet[]): WalletNode[] {
  const nodes = new Map<string, WalletNode>();
  const roots: WalletNode[] = [];

  wallets
    .filter((wallet) => !wallet.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .forEach((wallet) => {
      nodes.set(wallet.id, { ...wallet, children: [] });
    });

  nodes.forEach((node) => {
    if (node.parent_wallet_id && nodes.has(node.parent_wallet_id)) {
      nodes.get(node.parent_wallet_id)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

function createId() {
  return `wallet-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useWallet() {
  const [wallets, setWallets] = useState<Wallet[]>(mockWallets);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(mockWallets[0]?.id ?? null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(mockWallets.filter((wallet) => wallet.parent_wallet_id === null).map((wallet) => wallet.id))
  );
  const [modal, setModal] = useState<WalletModalState>({
    isOpen: false,
    mode: "create",
    wallet: null,
    parentId: null,
  });

  const walletTree = useMemo(() => buildWalletTree(wallets), [wallets]);

  const activeWallets = useMemo(
    () => wallets.filter((wallet) => !wallet.deleted_at),
    [wallets]
  );

  const selectedWallet = useMemo(
    () => activeWallets.find((wallet) => wallet.id === selectedWalletId) ?? activeWallets[0] ?? null,
    [activeWallets, selectedWalletId]
  );

  const childCount = useMemo(() => {
    if (!selectedWallet) return 0;
    return activeWallets.filter((wallet) => wallet.parent_wallet_id === selectedWallet.id).length;
  }, [activeWallets, selectedWallet]);

  const toggleExpanded = (walletId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(walletId)) {
        next.delete(walletId);
      } else {
        next.add(walletId);
      }
      return next;
    });
  };

  const openCreateWallet = (parentId: string | null = null) => {
    setModal({ isOpen: true, mode: "create", wallet: null, parentId });
  };

  const openEditWallet = (wallet: Wallet) => {
    setModal({ isOpen: true, mode: "edit", wallet, parentId: wallet.parent_wallet_id });
  };

  const closeModal = () => {
    setModal((current) => ({ ...current, isOpen: false }));
  };

  const saveWallet = (values: WalletFormValues) => {
    if (modal.mode === "edit" && modal.wallet) {
      setWallets((current) =>
        current.map((wallet) =>
          wallet.id === modal.wallet?.id
            ? {
                ...wallet,
                name: values.name.trim(),
                description: values.description.trim() || null,
                wallet_type: values.wallet_type,
                parent_wallet_id: values.parent_wallet_id,
                color: values.color || null,
                icon: values.icon.trim() || null,
                updated_at: new Date().toISOString(),
              }
            : wallet
        )
      );
      closeModal();
      return;
    }

    const wallet: Wallet = {
      id: createId(),
      user_id: USER_ID,
      parent_wallet_id: values.parent_wallet_id,
      name: values.name.trim(),
      description: values.description.trim() || null,
      wallet_type: values.wallet_type,
      balance: "0",
      currency: "THB",
      color: values.color || null,
      icon: values.icon.trim() || null,
      sort_order: activeWallets.length,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    setWallets((current) => [...current, wallet]);
    setSelectedWalletId(wallet.id);

    if (wallet.parent_wallet_id) {
      setExpandedIds((current) => new Set(current).add(wallet.parent_wallet_id as string));
    }

    closeModal();
  };

  const deleteWallet = (walletId: string) => {
    const wallet = activeWallets.find((item) => item.id === walletId);
    if (!wallet) return;

    setWallets((current) =>
      current.map((item) => {
        if (item.id === walletId) {
          return { ...item, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        }

        if (item.parent_wallet_id === walletId) {
          return { ...item, parent_wallet_id: wallet.parent_wallet_id, updated_at: new Date().toISOString() };
        }

        return item;
      })
    );

    const fallback = activeWallets.find((item) => item.id !== walletId && item.parent_wallet_id === wallet.parent_wallet_id)
      ?? activeWallets.find((item) => item.id !== walletId)
      ?? null;

    setSelectedWalletId(fallback?.id ?? null);
  };

  return {
    wallets: activeWallets,
    walletTree,
    selectedWallet,
    selectedWalletId,
    expandedIds,
    modal,
    childCount,
    selectWallet: setSelectedWalletId,
    toggleExpanded,
    openCreateWallet,
    openEditWallet,
    closeModal,
    saveWallet,
    deleteWallet,
  };
}
