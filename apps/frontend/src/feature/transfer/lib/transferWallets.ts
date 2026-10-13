import type { Wallet } from "@/feature/wallet/hooks/useWallet";

export function getTransferSelectableWallets(wallets: Wallet[]) {
  const activeWallets = wallets.filter(
    (wallet) => wallet.is_active && wallet.deleted_at === null
  );
  const parentWalletIds = new Set<string>();

  activeWallets.forEach((wallet) => {
    if (wallet.parent_wallet_id) {
      parentWalletIds.add(wallet.parent_wallet_id);
    }
  });

  return activeWallets.filter((wallet) => !parentWalletIds.has(wallet.id));
}

export function getTransferWalletDisplayName(wallet: Wallet, wallets: Wallet[]) {
  const parentWallet = wallet.parent_wallet_id
    ? wallets.find((candidate) => candidate.id === wallet.parent_wallet_id)
    : null;

  return parentWallet
    ? `${parentWallet.name} : ${wallet.name}`
    : wallet.name;
}
