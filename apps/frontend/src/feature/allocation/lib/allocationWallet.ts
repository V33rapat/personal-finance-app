import type { Wallet } from "@/feature/wallet/hooks/useWallet";

export function getEligibleAllocationWallets(wallets: Wallet[]) {
  const activeWallets = wallets.filter(
    (wallet) => wallet.deleted_at === null && wallet.is_active
  );
  const parentWalletIds = new Set(
    activeWallets
      .map((wallet) => wallet.parent_wallet_id)
      .filter((walletId): walletId is string => walletId !== null)
  );

  return activeWallets
    .filter((wallet) => !parentWalletIds.has(wallet.id))
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
}

export function getAllocationWalletLabel(wallet: Wallet, wallets: Wallet[]) {
  const parentWallet = wallet.parent_wallet_id
    ? wallets.find((item) => item.id === wallet.parent_wallet_id)
    : null;

  return parentWallet ? `${parentWallet.name}: ${wallet.name}` : wallet.name;
}

export function formatWalletMoney(value: string | number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
