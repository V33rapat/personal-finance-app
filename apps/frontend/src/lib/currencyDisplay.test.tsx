import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TransferBalancePreview from "@/feature/transfer/components/TransferBalancePreview";
import TransferForm from "@/feature/transfer/components/TransferForm";
import WalletTreeItem from "@/feature/wallet/components/WalletTreeItem";
import type { Wallet, WalletNode } from "@/feature/wallet/hooks/useWallet";

function createWallet(id: string, balance: string): Wallet {
  return {
    id,
    user_id: "user-1",
    parent_wallet_id: null,
    name: id === "wallet-1" ? "กระเป๋าหลัก" : "กระเป๋าสำรอง",
    description: null,
    wallet_type: "normal",
    balance,
    currency: "THB",
    color: null,
    icon: null,
    sort_order: 0,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
  };
}

describe("two-decimal currency displays", () => {
  it("shows cents in the wallet tree", () => {
    const wallet: WalletNode = {
      ...createWallet("wallet-1", "1234.5"),
      children: [],
    };

    const markup = renderToStaticMarkup(
      <WalletTreeItem
        wallet={wallet}
        expandedIds={new Set()}
        selectedWalletId={wallet.id}
        onSelect={() => undefined}
        onToggle={() => undefined}
        onAddSubWallet={() => undefined}
      />,
    );

    expect(markup).toContain("THB 1,234.50");
  });

  it("shows cents in transfer wallet options and balance preview", () => {
    const sourceWallet = createWallet("wallet-1", "1234.5");
    const destinationWallet = createWallet("wallet-2", "50");
    const formMarkup = renderToStaticMarkup(
      <TransferForm
        wallets={[sourceWallet, destinationWallet]}
        isSaving={false}
        onSubmit={async () => true}
      />,
    );
    const previewMarkup = renderToStaticMarkup(
      <TransferBalancePreview
        sourceWallet={sourceWallet}
        destinationWallet={destinationWallet}
        amount="0.25"
      />,
    );

    expect(formMarkup).toContain("฿1,234.50");
    expect(formMarkup).toContain("฿50.00");
    expect(previewMarkup).toContain("฿1,234.50");
    expect(previewMarkup).toContain("฿1,234.25");
    expect(previewMarkup).toContain("฿50.25");
  });
});
