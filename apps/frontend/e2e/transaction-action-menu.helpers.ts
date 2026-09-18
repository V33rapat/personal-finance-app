import { expect, type Locator, type Page } from "@playwright/test";

export const ACTION_MANUAL_EXPENSE = "E2E Action Manual Expense";
export const ACTION_MANUAL_INCOME = "E2E Action Manual Income";
export const ACTION_INTERACTION_TARGET = "E2E Action Interaction Target";
export const ACTION_EXISTING_TEMPLATE = "E2E Action Existing Template";
export const ACTION_REPLACEMENT_TEMPLATE = "E2E Action Replacement Template";
export const ACTION_DATE = "2026-07-20";

export type TransactionAction = "edit" | "duplicate" | "template" | "delete";

export async function openTransactions(page: Page) {
  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: "รายการธุรกรรม", exact: true })).toBeVisible();
  await expect(page.getByTestId("daily-transaction-row").first()).toBeVisible();
}

export function getTransactionRows(page: Page) {
  return page.getByTestId("daily-transaction-row");
}

export function getTransactionRow(page: Page, name: string) {
  return getTransactionRows(page).filter({ hasText: name }).first();
}

export async function openActionMenu(row: Locator) {
  const trigger = row.getByTestId("transaction-action-menu-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();

  const menu = row.getByTestId("transaction-action-menu");
  await expect(menu).toBeVisible();
  return { menu, trigger };
}

export async function chooseAction(row: Locator, action: TransactionAction) {
  const { menu } = await openActionMenu(row);
  const item = menu.getByTestId(`transaction-action-${action}`);
  await expect(item).toBeVisible();
  await item.click();
}

export function waitForTransactionRequest(
  page: Page,
  method: string,
  path: string,
) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === path && request.method() === method;
  });
}

export function waitForTransactionResponse(
  page: Page,
  method: string,
  path: string,
) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === path && response.request().method() === method;
  });
}

export function getTransactionModal(page: Page) {
  return page.getByTestId("transaction-modal");
}

export function getConfirmationDialog(page: Page) {
  return page.getByRole("dialog");
}

export function getActionMenuItem(row: Locator, action: TransactionAction) {
  return row.getByTestId(`transaction-action-${action}`);
}
