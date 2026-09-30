import { expect, test } from "@playwright/test";
import { getBangkokToday } from "./spending-budget.helpers";
import { dateFieldValue } from "./date-format.helpers";

async function expectDateFieldsUseDisplayFormat(page: import("@playwright/test").Page) {
  const today = dateFieldValue(getBangkokToday());

  await page.goto("/transactions");
  const startDateFilter = page.getByTestId("transaction-filter-start-date");
  await expect(startDateFilter).toHaveAttribute("placeholder", "DD/MM/YYYY");
  await startDateFilter.fill("18092026");
  await expect(startDateFilter).toHaveValue("18/09/2026");

  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();
  const transactionDate = page.getByTestId("transaction-date");
  await expect(transactionDate).toBeVisible();
  await expect(transactionDate).toHaveValue(today);
  await transactionDate.fill("18092026");
  await expect(transactionDate).toHaveValue("18/09/2026");
  await page.getByRole("button", { name: /เลือกวันที่จากปฏิทิน/ }).last().click();
  const datePicker = page.getByRole("dialog").last();
  await datePicker.getByRole("button", { name: new RegExp(today) }).click();
  await expect(transactionDate).toHaveValue(today);

  await page.goto("/transfer");
  await expect(page.getByTestId("transfer-date")).toHaveValue(today);

  await page.goto("/allocation");
  await expect(page.getByTestId("allocation-date")).toHaveValue(today);

  await page.goto("/spending-plans/new");
  await expect(page.getByTestId("spending-plan-start-date")).toHaveAttribute(
    "placeholder",
    "DD/MM/YYYY"
  );
  await expect(page.getByTestId("spending-plan-end-date")).toHaveAttribute(
    "placeholder",
    "DD/MM/YYYY"
  );
}

test.describe("Date format with English browser locale", () => {
  test.use({ locale: "en-US" });

  test("shows DD/MM/YYYY across date entry pages", async ({ page }) => {
    await expectDateFieldsUseDisplayFormat(page);
  });
});

test.describe("Date format with Thai browser locale", () => {
  test.use({ locale: "th-TH" });

  test("shows DD/MM/YYYY across date entry pages", async ({ page }) => {
    await expectDateFieldsUseDisplayFormat(page);
  });
});
