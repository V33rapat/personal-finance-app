import { expect, test } from "@playwright/test";
import {
  getAnnouncementDialog,
  loginToAnnouncementAccount,
  RELEASE_ANNOUNCEMENT_EMAILS,
} from "./release-announcements.helpers";

test("announcement popup and history fit mobile and support keyboard close", async ({ page }) => {
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.mobile);
  const dialog = await getAnnouncementDialog(page);
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.width);

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(dimensions.width);

  const closeButton = dialog.getByRole("button", { name: "ปิดประกาศ" });
  const closeBounds = await closeButton.boundingBox();
  expect(closeBounds?.height).toBeGreaterThanOrEqual(40);

  const checkbox = dialog.getByLabel("ไม่แสดงอีกสำหรับเวอร์ชั่นนี้");
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "มีอะไรใหม่", exact: true }).click();
  await expect(page.getByTestId("release-announcement-history")).toBeVisible();
  const pageDimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(pageDimensions.documentWidth).toBeLessThanOrEqual(pageDimensions.width);
  await expect(page.getByTestId("release-announcement-walpaca-1.2.0")).toBeVisible();
});
