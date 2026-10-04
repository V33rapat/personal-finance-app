import { expect, type Locator, type Page } from "@playwright/test";

export const TRANSFER_TEST_DATE = "2025-12-15";
export const TRANSFER_DELETED_WALLET_ID =
  "90000000-0000-4000-8000-000000000001";

export interface TransferWalletFixture {
  id: string;
  name: string;
  parent_wallet_id: string | null;
  balance: string | number;
  is_active: boolean;
  deleted_at: string | null;
}

export interface TransferFixture {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: string | number;
  note: string | null;
}

export interface TransferPayload {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  transfer_date: string;
  note: string;
}

export async function readWallets(page: Page) {
  const response = await page.request.get("/api/wallet");
  expect(response.ok(), response.ok() ? "" : await response.text()).toBe(true);
  const wallets: unknown = await response.json();
  expect(Array.isArray(wallets)).toBe(true);
  return wallets as TransferWalletFixture[];
}

export function findWallet(wallets: TransferWalletFixture[], name: string) {
  const wallet = wallets.find((candidate) => candidate.name === name);
  expect(wallet, `Expected seeded wallet: ${name}`).toBeDefined();
  return wallet!;
}

export async function openTransferForm(page: Page) {
  await page.goto("/transfer");
  const source = page.locator("#transfer-source-wallet");
  const destination = page.locator("#transfer-destination-wallet");
  await expect(source).toBeVisible();
  await expect(destination).toBeVisible();
  return { source, destination };
}

export async function getOptionValues(select: Locator) {
  return select.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
}

export async function postTransfer(page: Page, payload: TransferPayload) {
  return page.request.post("/api/transfer", { data: payload });
}

export async function readTransfers(page: Page) {
  const response = await page.request.get("/api/transfer");
  expect(response.ok(), response.ok() ? "" : await response.text()).toBe(true);
  const transfers: unknown = await response.json();
  expect(Array.isArray(transfers)).toBe(true);
  return transfers as TransferFixture[];
}

export async function readBalances(page: Page, walletIds: string[]) {
  const wallets = await readWallets(page);
  return new Map(
    walletIds.map((walletId) => {
      const wallet = wallets.find((candidate) => candidate.id === walletId);
      expect(wallet, `Expected wallet balance for ${walletId}`).toBeDefined();
      return [walletId, Number(wallet!.balance)];
    }),
  );
}

export async function removeTransfer(page: Page, transferId: string) {
  const response = await page.request.delete(`/api/transfer/${transferId}`);
  expect(response.ok(), response.ok() ? "" : await response.text()).toBe(true);
}
