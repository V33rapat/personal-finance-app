import { expect, type Page } from "@playwright/test";

export function dateFieldValue(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

export async function openTransactionModal(page: Page, name: string) {
  await page.goto("/transactions");
  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();

  const dialog = page.getByTestId("transaction-modal");
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("transaction-wallet").selectOption({ label: "E2E เงินสด" });
  await dialog.getByTestId("transaction-name").fill(name);
  await dialog.getByTestId("transaction-amount").fill("11.25");

  return dialog;
}
