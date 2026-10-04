import type { Wallet } from "@/feature/wallet/hooks/useWallet";

export function getTransferSelectableWallets(wallets: Wallet[]) {
  const parentWalletIds = new Set<string>();

  wallets.forEach((wallet) => {
    if (
      wallet.is_active &&
      wallet.deleted_at === null &&
      wallet.parent_wallet_id
    ) {
      parentWalletIds.add(wallet.parent_wallet_id);
    }
  });

  return wallets.filter((wallet) => !parentWalletIds.has(wallet.id));
}
