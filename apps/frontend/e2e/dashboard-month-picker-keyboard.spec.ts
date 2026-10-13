import { expect, test } from "@playwright/test";
import {
  addMonths,
  openDashboard,
  showPickerYear,
  waitForDashboardSummaryResponse,
} from "./dashboard-month-picker.helpers";

test.describe("Dashboard month picker keyboard and dismissal", () => {
  test("opens and selects months with the keyboard, then restores focus", async ({ page }) => {
    const { month } = await openDashboard(page);
    let firstMonth = addMonths(month, -2);
    if (firstMonth.slice(0, 4) !== addMonths(firstMonth, 1).slice(0, 4)) {
      firstMonth = addMonths(firstMonth, -1);
    }
    const keyboardTargetMonth = addMonths(firstMonth, 1);
    const trigger = page.getByTestId("dashboard-month-picker-trigger");

    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByTestId("dashboard-month-picker-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId(`dashboard-month-option-${month}`)).toBeFocused();
    await showPickerYear(page, Number(firstMonth.slice(0, 4)));

    const firstOption = page.getByTestId(`dashboard-month-option-${firstMonth}`);
    await firstOption.focus();
    await expect(firstOption).toBeFocused();
    await page.keyboard.press("Tab");
    const nextOption = page.getByTestId(`dashboard-month-option-${keyboardTargetMonth}`);
    await expect(nextOption).toBeFocused();

    const responsePromise = waitForDashboardSummaryResponse(page, keyboardTargetMonth);
    await page.keyboard.press("Enter");
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("closes with Escape and returns focus to the trigger", async ({ page }) => {
    await openDashboard(page);
    const trigger = page.getByTestId("dashboard-month-picker-trigger");
    await trigger.click();
    const dialog = page.getByTestId("dashboard-month-picker-dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("closes when the user clicks outside the picker", async ({ page }) => {
    await openDashboard(page);
    await page.getByTestId("dashboard-month-picker-trigger").click();
    const dialog = page.getByTestId("dashboard-month-picker-dialog");
    await expect(dialog).toBeVisible();

    await page.getByTestId("dashboard-summary-total-balance").click();
    await expect(dialog).toHaveCount(0);
  });

  test("exposes dialog state and the selected month accessibly", async ({ page }) => {
    const { month } = await openDashboard(page);
    const trigger = page.getByTestId("dashboard-month-picker-trigger");

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "เลือกเดือนที่ต้องการดู" });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId(`dashboard-month-option-${month}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog.getByRole("group", { name: "เลือกเดือน" })).toBeVisible();
  });
});
