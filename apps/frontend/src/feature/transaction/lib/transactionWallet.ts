import type { Wallet } from "@/feature/wallet/hooks/useWallet";

export interface TransactionWalletOption {
  id: string;
  label: string;
}

function getActiveWallets(wallets: Wallet[]) {
  return wallets.filter((wallet) => wallet.deleted_at === null && wallet.is_active);
}

export function getTransactionWalletOptions(
  wallets: Wallet[]
): TransactionWalletOption[] {
  const activeWallets = getActiveWallets(wallets);
  const walletById = new Map(activeWallets.map((wallet) => [wallet.id, wallet]));
  const parentWalletIds = new Set(
    activeWallets
      .map((wallet) => wallet.parent_wallet_id)
      .filter((walletId): walletId is string => walletId !== null)
  );

  return activeWallets
    .filter((wallet) => !parentWalletIds.has(wallet.id))
    .map((wallet) => {
      const parentWallet = wallet.parent_wallet_id
        ? walletById.get(wallet.parent_wallet_id)
        : null;

      return {
        id: wallet.id,
        label: parentWallet ? `${parentWallet.name}: ${wallet.name}` : wallet.name,
      };
    });
}

export function isTransactionWalletEligible(walletId: string, wallets: Wallet[]) {
  return getTransactionWalletOptions(wallets).some(
    (wallet) => wallet.id === walletId
  );
}
