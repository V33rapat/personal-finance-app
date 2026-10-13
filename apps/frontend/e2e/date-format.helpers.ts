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
  const walletSelect = dialog.getByTestId("transaction-wallet");
  const walletId = await walletSelect.locator("option").evaluateAll((options) =>
    options.find((option) => {
      const label = option.textContent?.trim() ?? "";
      return label === "E2E เงินสด" || label.startsWith("E2E เงินสด (");
    })?.getAttribute("value"),
  );
  if (!walletId) throw new Error("Missing transaction wallet option: E2E เงินสด");
  await walletSelect.selectOption(walletId);
  await dialog.getByTestId("transaction-name").fill(name);
  await dialog.getByTestId("transaction-amount").fill("11.25");

  return dialog;
}
