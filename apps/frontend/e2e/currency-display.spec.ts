import { expect, test, type Page } from "@playwright/test";
import {
  findWallet,
  openTransferForm,
  type TransferWalletFixture,
} from "./transfer-wallet-validation.helpers";

const sourceWalletName = "E2E Transfer Source";
const destinationWalletName = "E2E Transfer Destination";

function formatThb(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function readWalletsInBrowser(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/wallet");
    if (!response.ok) {
      throw new Error(`Wallet request failed with status ${response.status}`);
    }
    return (await response.json()) as TransferWalletFixture[];
  });
}

test.describe("Two-decimal currency display", () => {
  test("shows two decimal places for a wallet balance", async ({ page }) => {
    await page.goto("/wallet");
    const sourceWallet = page.getByRole("button", {
      name: /^E2E Transfer Source THB/,
    });
    await expect(sourceWallet).toBeVisible();
    await sourceWallet.click();

    await expect(
      page.getByRole("heading", { name: sourceWalletName, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("฿1,234.50", { exact: true })).toBeVisible();
  });

  test("shows cents in transfer options, summary, and balance preview without submitting", async ({
    page,
  }) => {
    const { source, destination } = await openTransferForm(page);
    const wallets = await readWalletsInBrowser(page);
    const sourceWallet = findWallet(wallets, sourceWalletName);
    const destinationWallet = findWallet(wallets, destinationWalletName);
    const totalRootBalance = wallets
      .filter((wallet) => !wallet.parent_wallet_id)
      .reduce((total, wallet) => total + Number(wallet.balance), 0);
    let transferPostCount = 0;

    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/transfer" &&
        request.method() === "POST"
      ) {
        transferPostCount += 1;
      }
    });

    await expect(
      source.locator(`option[value="${sourceWallet.id}"]`),
    ).toContainText("฿1,234.50");
    await expect(
      destination.locator(`option[value="${destinationWallet.id}"]`),
    ).toContainText("฿250.25");

    await source.selectOption(sourceWallet.id);
    await destination.selectOption(destinationWallet.id);
    await page.locator("#transfer-amount").fill("0.25");

    await expect(page.getByText(formatThb(totalRootBalance), { exact: true })).toBeVisible();

    const preview = page.locator("form section").first();
    await expect(preview.getByText("฿1,234.50", { exact: true })).toBeVisible();
    await expect(preview.getByText("฿1,234.25", { exact: true })).toBeVisible();
    await expect(preview.getByText("฿250.25", { exact: true })).toBeVisible();
    await expect(preview.getByText("฿250.50", { exact: true })).toBeVisible();
    expect(transferPostCount).toBe(0);
  });
});
