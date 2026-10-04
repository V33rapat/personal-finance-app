import { expect, test } from "@playwright/test";
import {
  findWallet,
  getOptionValues,
  openTransferForm,
  readWallets,
} from "./transfer-wallet-validation.helpers";

test("keeps transfer wallet selectors usable on mobile", async ({ page }) => {
  const wallets = await readWallets(page);
  const sourceWallet = findWallet(wallets, "E2E Transfer Source");
  const parentWallet = findWallet(wallets, "E2E Transfer Parent");
  const childWallet = findWallet(wallets, "E2E Transfer Child");
  const { source, destination } = await openTransferForm(page);

  for (const selector of [source, destination]) {
    const optionValues = await getOptionValues(selector);
    expect(optionValues).toContain(sourceWallet.id);
    expect(optionValues).toContain(childWallet.id);
    expect(optionValues).not.toContain(parentWallet.id);
    await expect(
      selector.locator(`option[value="${childWallet.id}"]`),
    ).toContainText(`${parentWallet.name} : ${childWallet.name}`);
  }

  await source.selectOption(sourceWallet.id);
  await destination.selectOption(childWallet.id);

  const formBox = await page.locator("form").boundingBox();
  const viewport = page.viewportSize();
  expect(formBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(formBox!.x).toBeGreaterThanOrEqual(0);
  expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(viewport!.width);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
