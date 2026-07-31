export const DASHBOARD_WALLET_SUMMARY_LIMIT = 4;

export type DashboardWalletType = "normal" | "investment";

export interface DashboardWalletSummaryWallet {
  id: string;
  name: string;
  parent_name: string | null;
  wallet_type: DashboardWalletType;
  balance: string;
  color: string | null;
  icon: string | null;
  is_available: boolean;
}

export interface DashboardWalletSummaryResponse {
  is_configured: boolean;
  displayed_wallets: DashboardWalletSummaryWallet[];
  selected_wallets: DashboardWalletSummaryWallet[];
  eligible_wallets: DashboardWalletSummaryWallet[];
}

export function getWalletSummaryLabel(wallet: DashboardWalletSummaryWallet) {
  return wallet.parent_name ? `${wallet.parent_name}: ${wallet.name}` : wallet.name;
}

export function toggleDashboardWalletSelection(
  walletIds: string[],
  walletId: string,
): string[] | null {
  if (walletIds.includes(walletId)) {
    return walletIds.filter((id) => id !== walletId);
  }

  if (walletIds.length >= DASHBOARD_WALLET_SUMMARY_LIMIT) {
    return null;
  }

  return [...walletIds, walletId];
}

export function getUnavailableWallets(
  wallets: DashboardWalletSummaryWallet[],
) {
  return wallets.filter((wallet) => !wallet.is_available);
}
