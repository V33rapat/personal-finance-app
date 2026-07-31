import { expect, type Locator, type Page } from "@playwright/test";

export const CREATE_DATE = "2026-07-26";

interface TransactionInput {
  name: string;
  amount: string;
  date: string;
  category?: string;
  note?: string;
}

export async function openDailyTransactionModal(page: Page) {
  await page
    .getByRole("button", { name: "เพิ่มรายการ", exact: true })
    .click();
  const dialog = page.getByTestId("transaction-modal");
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function fillTransactionModal(
  dialog: Locator,
  { name, amount, date, category, note = "" }: TransactionInput,
) {
  await dialog.getByTestId("transaction-name").fill(name);
  await dialog.getByTestId("transaction-amount").fill(amount);
  await dialog.getByTestId("transaction-date").fill(date);
  await dialog.getByTestId("transaction-note").fill(note);

  if (category) {
    const categoryInput = dialog.getByPlaceholder("เลือกหมวดหมู่");
    await categoryInput.fill(category);
    await dialog.getByRole("button", { name: category, exact: true }).click();
  }
}

export async function saveTransactionModal(page: Page, dialog: Locator) {
  const createResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/transaction" &&
      response.request().method() === "POST"
    );
  });
  await dialog.getByRole("button", { name: "บันทึก", exact: true }).click();
  await createResponse;
  await expect(dialog).toBeHidden();
}
