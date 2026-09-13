import { expect, test } from "@playwright/test";
import {
  DAILY_DATE,
  openDailyDatePicker,
  openDailyTransactions,
  selectDailyDate,
} from "./wallet-daily.helpers";

test("keeps Daily Transaction View controls usable on a mobile viewport", async ({ page }) => {
  await openDailyTransactions(page);
  await selectDailyDate(page, DAILY_DATE);

  const previous = page.getByTestId("daily-previous-day");
  const next = page.getByTestId("daily-next-day");
  const trigger = page.getByTestId("daily-date-picker-trigger");
  const filter = page.getByTestId("daily-filter-type");
  const summary = page.getByTestId("daily-summary");
  const rows = page.getByTestId("daily-transaction-row");

  for (const locator of [previous, next, trigger, filter, summary, rows.first()]) {
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toBeInViewport();
  }

  await expect(previous).toBeEnabled();
  await expect(next).toBeEnabled();
  const previousBox = await previous.boundingBox();
  const nextBox = await next.boundingBox();
  expect(previousBox?.width).toBeGreaterThanOrEqual(40);
  expect(previousBox?.height).toBeGreaterThanOrEqual(40);
  expect(nextBox?.width).toBeGreaterThanOrEqual(40);
  expect(nextBox?.height).toBeGreaterThanOrEqual(40);

  const { dialog } = await openDailyDatePicker(page);
  await expect(dialog).toBeInViewport();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
