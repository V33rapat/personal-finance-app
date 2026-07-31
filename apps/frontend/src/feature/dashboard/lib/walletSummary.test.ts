import { describe, expect, it } from "vitest";
import {
  DASHBOARD_WALLET_SUMMARY_LIMIT,
  getUnavailableWallets,
  getWalletSummaryLabel,
  toggleDashboardWalletSelection,
  type DashboardWalletSummaryWallet,
} from "./walletSummary";

const wallet: DashboardWalletSummaryWallet = {
  id: "wallet-1",
  name: "เงินสำรอง",
  parent_name: "เงินเก็บ",
  wallet_type: "normal",
  balance: "500.00",
  color: "#7C3AED",
  icon: null,
  is_available: true,
};

describe("dashboard wallet summary helpers", () => {
  it("formats a Sub-wallet label with its Parent Wallet", () => {
    expect(getWalletSummaryLabel(wallet)).toBe("เงินเก็บ: เงินสำรอง");
    expect(getWalletSummaryLabel({ ...wallet, parent_name: null })).toBe(
      "เงินสำรอง",
    );
  });

  it("allows selecting from zero through four wallets", () => {
    const selected = ["wallet-1", "wallet-2", "wallet-3"];

    expect(toggleDashboardWalletSelection(selected, "wallet-4")).toEqual([
      "wallet-1",
      "wallet-2",
      "wallet-3",
      "wallet-4",
    ]);
    expect(
      toggleDashboardWalletSelection(
        [...selected, "wallet-4"],
        "wallet-5",
      ),
    ).toBeNull();
    expect(toggleDashboardWalletSelection(["wallet-1"], "wallet-1")).toEqual(
      [],
    );
    expect(DASHBOARD_WALLET_SUMMARY_LIMIT).toBe(4);
  });

  it("keeps unavailable selected wallets separate from available choices", () => {
    expect(
      getUnavailableWallets([
        wallet,
        { ...wallet, id: "wallet-2", is_available: false },
      ]),
    ).toEqual([{ ...wallet, id: "wallet-2", is_available: false }]);
  });
});
