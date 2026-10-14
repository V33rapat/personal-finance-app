import type { Locator } from "@playwright/test";
import { dateFieldValue } from "./date-format.helpers";

export async function chooseCalendarDate(
  dialog: Locator,
  currentDate: string,
  targetDate: string,
) {
  const current = new Date(`${currentDate}T00:00:00.000Z`);
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const monthDifference =
    (target.getUTCFullYear() - current.getUTCFullYear()) * 12 +
    target.getUTCMonth() -
    current.getUTCMonth();
  const navigationName =
    monthDifference < 0 ? "แสดงเดือนก่อนหน้า" : "แสดงเดือนถัดไป";

  for (let month = 0; month < Math.abs(monthDifference); month += 1) {
    await dialog.getByRole("button", { name: navigationName, exact: true }).click();
  }

  await dialog
    .getByRole("button", {
      name: `เลือกวันที่จากปฏิทิน: ${dateFieldValue(targetDate)}`,
      exact: true,
    })
    .click();
}
