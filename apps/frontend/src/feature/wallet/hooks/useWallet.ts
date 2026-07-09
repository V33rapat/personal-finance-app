"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";

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

function normalizeWallet(wallet: Wallet): Wallet {
  return {
    ...wallet,
    balance: String(wallet.balance ?? "0"),
    currency: wallet.currency ?? "THB",
    sort_order: wallet.sort_order ?? 0,
    is_active: wallet.is_active ?? true,
  };
}

async function readWalletResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "Failed to load wallets");
  }

  return data;
}

function toWalletPayload(values: WalletFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    wallet_type: values.wallet_type,
    parent_wallet_id: values.parent_wallet_id,
    color: values.color || null,
    icon: values.icon.trim() || null,
  };
}

export function useWallet() {
  const { showToast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<WalletModalState>({
    isOpen: false,
    mode: "create",
    wallet: null,
    parentId: null,
  });

  const loadWallets = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/wallet");
      const data = await readWalletResponse(response);
      const nextWallets = Array.isArray(data) ? data.map(normalizeWallet) : [];

      setWallets(nextWallets);
      setSelectedWalletId((current) => {
        if (current && nextWallets.some((wallet) => wallet.id === current)) {
          return current;
        }

        return nextWallets[0]?.id ?? null;
      });
      setExpandedIds(
        new Set(
          nextWallets
            .filter((wallet) => wallet.parent_wallet_id === null)
            .map((wallet) => wallet.id)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallets");
      setWallets([]);
      setSelectedWalletId(null);
      setExpandedIds(new Set());
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const reloadWallets = useCallback(() => loadWallets(false), [loadWallets]);

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
    setError(null);
    setModal({ isOpen: true, mode: "create", wallet: null, parentId });
  };

  const openEditWallet = (wallet: Wallet) => {
    setError(null);
    setModal({ isOpen: true, mode: "edit", wallet, parentId: wallet.parent_wallet_id });
  };

  const closeModal = () => {
    setModal((current) => ({ ...current, isOpen: false }));
  };

  const saveWallet = async (values: WalletFormValues) => {
    setIsSaving(true);
    setError(null);

    if (modal.mode === "edit" && modal.wallet) {
      try {
        const response = await fetch(`/api/wallet/${modal.wallet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toWalletPayload(values)),
        });
        const updatedWallet = normalizeWallet(await readWalletResponse(response));

        setWallets((current) =>
          current.map((wallet) =>
            wallet.id === updatedWallet.id ? updatedWallet : wallet
          )
        );
        setSelectedWalletId(updatedWallet.id);

        if (updatedWallet.parent_wallet_id) {
          setExpandedIds((current) => new Set(current).add(updatedWallet.parent_wallet_id as string));
        }

        closeModal();
        showToast({ title: "แก้ไขกระเป๋าเงินสำเร็จ" });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update wallet";
        setError(message);
        showToast({ title: "แก้ไขกระเป๋าเงินไม่สำเร็จ", description: message, type: "error" });
        return false;
      } finally {
        setIsSaving(false);
      }
    }

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toWalletPayload(values)),
      });
      const wallet = normalizeWallet(await readWalletResponse(response));

      setWallets((current) => [...current, wallet]);
      setSelectedWalletId(wallet.id);

      if (wallet.parent_wallet_id) {
        setExpandedIds((current) => new Set(current).add(wallet.parent_wallet_id as string));
      }

      closeModal();
      showToast({ title: "สร้างกระเป๋าเงินสำเร็จ" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create wallet";
      setError(message);
      showToast({ title: "สร้างกระเป๋าเงินไม่สำเร็จ", description: message, type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWallet = async (walletId: string) => {
    const wallet = activeWallets.find((item) => item.id === walletId);
    if (!wallet) return false;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/wallet/${walletId}`, {
        method: "DELETE",
      });

      await readWalletResponse(response);

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
      showToast({ title: "ลบกระเป๋าเงินสำเร็จ" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete wallet";
      setError(message);
      showToast({ title: "ลบกระเป๋าเงินไม่สำเร็จ", description: message, type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    wallets: activeWallets,
    walletTree,
    selectedWallet,
    selectedWalletId,
    expandedIds,
    modal,
    childCount,
    isLoading,
    isSaving,
    error,
    selectWallet: setSelectedWalletId,
    toggleExpanded,
    openCreateWallet,
    openEditWallet,
    closeModal,
    reloadWallets,
    saveWallet,
    deleteWallet,
  };
}
