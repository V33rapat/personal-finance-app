import { describe, expect, it } from "vitest";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import {
  getTransferSelectableWallets,
  getTransferWalletDisplayName,
} from "./transferWallets";

function createWallet(
  id: string,
  parentWalletId: string | null = null,
  isActive = true
): Wallet {
  return {
    id,
    user_id: "user-1",
    parent_wallet_id: parentWalletId,
    name: id,
    description: null,
    wallet_type: "normal",
    balance: "100.00",
    currency: "THB",
    color: null,
    icon: null,
    sort_order: 0,
    is_active: isActive,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
  };
}

describe("getTransferSelectableWallets", () => {
  it("excludes a parent with an active sub-wallet and keeps its sub-wallet", () => {
    const wallets = [
      createWallet("parent"),
      createWallet("sub-wallet", "parent"),
      createWallet("standalone"),
    ];

    expect(
      getTransferSelectableWallets(wallets).map((wallet) => wallet.id)
    ).toEqual(["sub-wallet", "standalone"]);
  });

  it("hides inactive wallets and ignores inactive sub-wallet relationships", () => {
    const wallets = [
      createWallet("parent"),
      createWallet("inactive-child", "parent", false),
      createWallet("inactive-standalone", null, false),
    ];

    expect(
      getTransferSelectableWallets(wallets).map((wallet) => wallet.id)
    ).toEqual(["parent"]);
  });
});

describe("getTransferWalletDisplayName", () => {
  it("shows parent and sub-wallet names for a nested wallet", () => {
    const parent = createWallet("เงินเก็บ");
    const subWallet = createWallet("เที่ยวญี่ปุ่น", parent.id);

    expect(getTransferWalletDisplayName(subWallet, [parent, subWallet])).toBe(
      "เงินเก็บ : เที่ยวญี่ปุ่น"
    );
  });

  it("shows only the wallet name for a standalone wallet", () => {
    const wallet = createWallet("เงินสด");

    expect(getTransferWalletDisplayName(wallet, [wallet])).toBe("เงินสด");
  });
});
