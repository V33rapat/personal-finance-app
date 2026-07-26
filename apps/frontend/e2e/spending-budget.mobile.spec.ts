import { expect, test } from "@playwright/test";
import {
  getBudgetSection,
  openDashboard,
  openPeriodPicker,
} from "./spending-budget.helpers";

test("keeps Spending Budget controls usable on a mobile viewport", async ({ page }) => {
  await openDashboard(page);
  const section = await getBudgetSection(page);
  const tabList = section.getByRole("tablist");
  const pickerTrigger = section.getByRole("button", {
    name: /^เลือกวันที่:/,
  });

  await expect(tabList).toBeInViewport();
  await expect(pickerTrigger).toBeInViewport();
  await expect(page.getByTestId("spending-budget-period-label")).toBeInViewport();

  const dialog = await openPeriodPicker(page, "daily");
  await expect(dialog).toBeInViewport();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
});
