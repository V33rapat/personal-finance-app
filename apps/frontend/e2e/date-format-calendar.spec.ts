import { expect, test, type Page } from "@playwright/test";
import { getBangkokToday } from "./spending-budget.helpers";
import { dateFieldValue, openTransactionModal } from "./date-format.helpers";
import { chooseCalendarDate } from "./date-format-calendar.helpers";
import { authenticatedApiRequest } from "./authenticated-api.helpers";

const HISTORICAL_DATE = "2026-07-20";

async function createTransactionFromHistoricalCalendar(
  page: Page,
  localeSuffix: string,
) {
  const transactionName = `E2E Historical Calendar ${localeSuffix}`;
  const dialog = await openTransactionModal(page, transactionName);
  const dateField = dialog.getByTestId("transaction-date");
  const today = getBangkokToday();

  await dateField.fill(dateFieldValue(today));
  expect(await dateField.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  await dialog.getByRole("button", { name: /เลือกวันที่จากปฏิทิน/ }).click();

  const calendar = page.getByRole("dialog").last();
  const bounds = await calendar.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  await page.screenshot({ path: test.info().outputPath("calendar-viewport.png") });
  await chooseCalendarDate(calendar, today, HISTORICAL_DATE);
  await expect(dateField).toHaveValue(dateFieldValue(HISTORICAL_DATE));

  const createRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/transaction" && request.method() === "POST";
  });
  const createResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/transaction" && response.request().method() === "POST";
  });

  let createdTransactionId: string | undefined;
  try {
    await dialog.getByRole("button", { name: "บันทึก", exact: true }).click();
    const [request, response] = await Promise.all([createRequest, createResponse]);
    const payload = JSON.parse(request.postData() ?? "{}");
    const createdTransaction = await response.json();
    createdTransactionId = createdTransaction.id;

    expect(response.ok()).toBe(true);
    expect(payload.transaction_date).toBe(HISTORICAL_DATE);
    expect(createdTransactionId).toBeTruthy();

    await expect(dialog).toBeHidden();
    const createdRow = page
      .getByTestId("daily-transaction-row")
      .filter({ hasText: transactionName });
    await expect(createdRow).toContainText(dateFieldValue(HISTORICAL_DATE));

    await page.reload();
    await expect(
      page.getByTestId("daily-transaction-row").filter({ hasText: transactionName }),
    ).toContainText(dateFieldValue(HISTORICAL_DATE));
  } finally {
    if (createdTransactionId) {
      const response = await authenticatedApiRequest(
        page,
        `/api/transaction/${createdTransactionId}`,
        { method: "DELETE" },
      );
      expect(response.ok()).toBe(true);
    } else if (await dialog.isVisible()) {
      await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    }
  }
}

test.describe("Historical date selected from calendar with English browser locale", () => {
  test.use({ locale: "en-US" });

  test("sends the selected calendar day without shifting it", async ({ page }) => {
    await createTransactionFromHistoricalCalendar(page, "en-US");
  });
});

test.describe("Historical date selected from calendar with Thai browser locale", () => {
  test.use({ locale: "th-TH" });

  test("sends the selected calendar day without shifting it", async ({ page }) => {
    await createTransactionFromHistoricalCalendar(page, "th-TH");
  });
});

test.describe("Historical calendar on a narrow viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the calendar usable inside the transaction modal", async ({ page }) => {
    await createTransactionFromHistoricalCalendar(page, "narrow");
  });
});
