import { expect, type Locator, type Page } from "@playwright/test";
import { getBudgetSection } from "./spending-budget.helpers";

export const WALLET_SCOPE_TEXT = {
  all: "ทุกกระเป๋า",
  selected: "เลือกกระเป๋า",
  create: "สร้างงบใช้จ่าย",
  manage: "จัดการงบใช้จ่าย",
  save: "บันทึกงบใช้จ่าย",
  saveChanges: "บันทึกการแก้ไข",
  walletSearch: "ค้นหากระเป๋า",
  food: "E2E อาหาร",
  travel: "E2E เดินทาง",
  leisure: "E2E พักผ่อน",
  cash: "E2E เงินสด",
  savingsChild: "E2E เงินเก็บ: E2E เงินสำรอง",
  savingsParent: "E2E เงินเก็บ",
  investment: "E2E พอร์ตลงทุน",
  inactive: "E2E กระเป๋าปิด",
  deleted: "E2E กระเป๋าถูกลบ",
};

export interface BudgetFormValues {
  name: string;
  amount?: string;
  category?: string;
  period?: "daily" | "weekly" | "monthly" | "yearly";
}

export async function openBudgetManagement(page: Page) {
  const activeFormDialog = page
    .locator('[role="dialog"]')
    .filter({
      has: page.getByRole("heading", {
        name: /^(สร้างงบใช้จ่าย|แก้ไขงบใช้จ่าย)$/,
      }),
    })
    .first();

  if (await activeFormDialog.isVisible()) {
    await expect(activeFormDialog).toBeHidden();
  }

  const existingDialog = page
    .locator('[role="dialog"]')
    .filter({ hasText: WALLET_SCOPE_TEXT.manage })
    .first();

  if (await existingDialog.isVisible()) {
    return existingDialog;
  }

  const section = await getBudgetSection(page);
  await section
    .getByRole("button", { name: WALLET_SCOPE_TEXT.manage, exact: true })
    .click();

  await expect(existingDialog).toBeVisible();
  return existingDialog;
}

export async function openBudgetCreateForm(page: Page) {
  const managementDialog = await openBudgetManagement(page);
  await managementDialog
    .getByRole("button", { name: WALLET_SCOPE_TEXT.create, exact: true })
    .click();

  const formDialog = page.getByRole("dialog", {
    name: WALLET_SCOPE_TEXT.create,
  });
  await expect(formDialog).toBeVisible();
  return formDialog;
}

export async function fillBudgetForm(
  dialog: Locator,
  { name, amount = "1000", category = WALLET_SCOPE_TEXT.food, period = "daily" }: BudgetFormValues,
) {
  await dialog.getByLabel("ชื่องบใช้จ่าย").fill(name);
  await dialog.getByLabel("วงเงิน").fill(amount);
  await dialog.getByLabel("รอบงบ").selectOption(period);
  await dialog.getByLabel(category, { exact: true }).check();
}

export async function selectWalletScope(
  dialog: Locator,
  walletScope: "all" | "selected",
) {
  const label =
    walletScope === "all" ? WALLET_SCOPE_TEXT.all : WALLET_SCOPE_TEXT.selected;
  await dialog.getByLabel(label, { exact: true }).check();
}

export async function selectWallets(dialog: Locator, walletLabels: string[]) {
  for (const walletLabel of walletLabels) {
    await getWalletCheckbox(dialog, walletLabel).check();
  }
}

export function getWalletCheckbox(dialog: Locator, walletLabel: string) {
  const escapedLabel = walletLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return dialog.getByLabel(new RegExp(`^${escapedLabel} \\(`));
}

export function getManagedBudgetRow(dialog: Locator, name: string) {
  return dialog
    .getByText(name, { exact: true })
    .locator("xpath=../..");
}

export async function saveNewBudget(dialog: Locator) {
  await dialog
    .getByRole("button", { name: WALLET_SCOPE_TEXT.save, exact: true })
    .click();
}

export async function waitForBudgetMutation(
  page: Page,
  method: "POST" | "PATCH",
) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.startsWith("/api/spending-budget") && request.method() === method;
  });
}

export function expectWalletScopePayload(
  request: import("@playwright/test").Request,
  walletScope: "all" | "selected",
  walletCount: number,
) {
  const payload = request.postDataJSON() as {
    wallet_scope?: string;
    wallet_ids?: unknown[];
  };

  expect(payload.wallet_scope).toBe(walletScope);
  expect(payload.wallet_ids).toHaveLength(walletCount);
}

export async function expectManagedBudget(
  dialog: Locator,
  name: string,
  scopeLabel: string,
) {
  const row = getManagedBudgetRow(dialog, name);
  await expect(row).toContainText(scopeLabel);
}
