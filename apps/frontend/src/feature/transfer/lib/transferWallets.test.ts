import { describe, expect, it } from "vitest";
import type { Wallet } from "@/feature/wallet/hooks/useWallet";
import { getTransferSelectableWallets } from "./transferWallets";

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

  it("does not treat an inactive sub-wallet as an active parent relationship", () => {
    const wallets = [
      createWallet("parent"),
      createWallet("inactive-child", "parent", false),
    ];

    expect(
      getTransferSelectableWallets(wallets).map((wallet) => wallet.id)
    ).toEqual(["parent", "inactive-child"]);
  });
});
