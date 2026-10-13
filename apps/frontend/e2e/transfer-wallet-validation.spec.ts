import { expect, test } from "@playwright/test";
import { dateFieldValue } from "./date-format.helpers";
import {
  findWallet,
  getOptionValues,
  openTransferForm,
  readBalances,
  readWallets,
  removeTransfer,
  TRANSFER_DELETED_WALLET_ID,
} from "./transfer-wallet-validation.helpers";

const walletNames = {
  source: "E2E Transfer Source",
  destination: "E2E Transfer Destination",
  parent: "E2E Transfer Parent",
  child: "E2E Transfer Child",
  inactive: "E2E Transfer Inactive",
};

test.describe("Transfer wallet validation", () => {
  test("shows eligible wallets only and labels a child with its parent", async ({
    page,
  }) => {
    const wallets = await readWallets(page);
    const sourceWallet = findWallet(wallets, walletNames.source);
    const destinationWallet = findWallet(wallets, walletNames.destination);
    const parentWallet = findWallet(wallets, walletNames.parent);
    const childWallet = findWallet(wallets, walletNames.child);
    const inactiveWallet = findWallet(wallets, walletNames.inactive);
    const { source, destination } = await openTransferForm(page);

    for (const selector of [source, destination]) {
      const optionValues = await getOptionValues(selector);
      expect(optionValues).toContain(sourceWallet.id);
      expect(optionValues).toContain(destinationWallet.id);
      expect(optionValues).toContain(childWallet.id);
      expect(optionValues).not.toContain(parentWallet.id);
      expect(optionValues).not.toContain(inactiveWallet.id);
      expect(optionValues).not.toContain(TRANSFER_DELETED_WALLET_ID);
      await expect(
        selector.locator(`option[value="${childWallet.id}"]`),
      ).toContainText(`${parentWallet.name} : ${childWallet.name}`);
      await expect(
        selector.locator(`option[value="${inactiveWallet.id}"]`),
      ).toHaveCount(0);
    }
  });

  test("creates a transfer between eligible wallets and updates balances", async ({
    page,
  }) => {
    const wallets = await readWallets(page);
    const sourceWallet = findWallet(wallets, walletNames.source);
    const parentWallet = findWallet(wallets, walletNames.parent);
    const childWallet = findWallet(wallets, walletNames.child);
    const balancesBefore = await readBalances(page, [
      sourceWallet.id,
      parentWallet.id,
      childWallet.id,
    ]);
    const { source, destination } = await openTransferForm(page);
    const note = `E2E Eligible Transfer ${Date.now()}`;
    let createdTransferId: string | null = null;

    try {
      await source.selectOption(sourceWallet.id);
      await destination.selectOption(childWallet.id);
      await page.locator("#transfer-amount").fill("25");
      await page.locator("#transfer-date").fill(dateFieldValue("2025-12-15"));
      await page.locator("#transfer-note").fill(note);

      const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/api/transfer" &&
          response.request().method() === "POST"
        );
      });
      await page.locator('form button[type="submit"]').click();
      const response = await responsePromise;
      expect(response.status()).toBe(201);

      const createdTransfer = (await response.json()) as { id: string };
      createdTransferId = createdTransfer.id;
      await expect(page.locator("article").filter({ hasText: note })).toBeVisible();

      const balancesAfter = await readBalances(page, [
        sourceWallet.id,
        parentWallet.id,
        childWallet.id,
      ]);
      expect(balancesAfter.get(sourceWallet.id)).toBe(
        balancesBefore.get(sourceWallet.id)! - 25,
      );
      expect(balancesAfter.get(childWallet.id)).toBe(
        balancesBefore.get(childWallet.id)! + 25,
      );
      expect(balancesAfter.get(parentWallet.id)).toBe(
        balancesBefore.get(parentWallet.id)! + 25,
      );
    } finally {
      if (createdTransferId) {
        await removeTransfer(page, createdTransferId);
      }
    }
  });
});
