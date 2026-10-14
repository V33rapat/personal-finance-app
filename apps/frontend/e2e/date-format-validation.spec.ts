import { expect, test, type Page, type Request } from "@playwright/test";
import { dateFieldValue, openTransactionModal } from "./date-format.helpers";

async function expectInvalidDateToBeRejected(page: Page, invalidValue: string) {
  const dialog = await openTransactionModal(page, "E2E Invalid Date Should Not Save");
  const dateField = dialog.getByTestId("transaction-date");
  await dateField.fill(dateFieldValue("2026-07-01"));
  expect(await dateField.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  await dateField.fill(invalidValue);
  await dateField.blur();

  await expect(dateField).toHaveValue(invalidValue);
  await expect(dateField).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByRole("alert")).toBeVisible();

  let transactionPosts = 0;
  const countTransactionPost = (request: Request) => {
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname === "/api/transaction") {
      transactionPosts += 1;
    }
  };
  page.on("request", countTransactionPost);

  try {
    await dialog.getByRole("button", { name: "บันทึก", exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(transactionPosts).toBe(0);

    await dateField.fill(dateFieldValue("2026-07-01"));
    await expect(dateField).toHaveAttribute("aria-invalid", "false");
  } finally {
    page.off("request", countTransactionPost);
    if (await dialog.isVisible()) {
      await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    }
  }
}

test.describe("Date input validation with English browser locale", () => {
  test.use({ locale: "en-US" });

  test("rejects a date that does not exist without creating a transaction", async ({ page }) => {
    await expectInvalidDateToBeRejected(page, "31/02/2026");
  });

  test("rejects an incomplete date without creating a transaction", async ({ page }) => {
    await expectInvalidDateToBeRejected(page, "20/07");
  });
});

test.describe("Date input validation with Thai browser locale", () => {
  test.use({ locale: "th-TH" });

  test("rejects a date that does not exist without creating a transaction", async ({ page }) => {
    await expectInvalidDateToBeRejected(page, "31/02/2026");
  });

  test("rejects an incomplete date without creating a transaction", async ({ page }) => {
    await expectInvalidDateToBeRejected(page, "20/07");
  });
});
