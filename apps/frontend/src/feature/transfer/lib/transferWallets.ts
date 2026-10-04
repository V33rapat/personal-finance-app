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

export function getTransferWalletDisplayName(wallet: Wallet, wallets: Wallet[]) {
  const parentWallet = wallet.parent_wallet_id
    ? wallets.find((candidate) => candidate.id === wallet.parent_wallet_id)
    : null;

  return parentWallet
    ? `${parentWallet.name} : ${wallet.name}`
    : wallet.name;
}
