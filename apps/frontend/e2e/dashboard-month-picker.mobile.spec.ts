import { expect, test } from "@playwright/test";
import {
  addMonths,
  openDashboard,
  selectDashboardMonth,
  showPickerYear,
} from "./dashboard-month-picker.helpers";

async function expectPickerInsideViewport(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dashboard-month-picker-dialog");
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
}

test("keeps the Dashboard month picker usable on mobile in light and dark themes", async ({
  page,
}) => {
  const { month } = await openDashboard(page);
  const previousMonth = addMonths(month, -1);

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.getByTestId("dashboard-month-picker-trigger").click();

    const dialog = page.getByTestId("dashboard-month-picker-dialog");
    await expect(dialog).toBeVisible();
    await expectPickerInsideViewport(page);

    const monthOptions = dialog.getByRole("group", { name: "เลือกเดือน" }).getByRole("button");
    await expect(monthOptions).toHaveCount(12);
    for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
      const optionMonth = `${month.slice(0, 4)}-${String(monthNumber).padStart(2, "0")}`;
      await expect(dialog.getByTestId(`dashboard-month-option-${optionMonth}`)).toBeVisible();
    }

    if (colorScheme === "light") {
      await showPickerYear(page, Number(previousMonth.slice(0, 4)));
      await selectDashboardMonth(page, previousMonth);
    } else {
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  }
});
