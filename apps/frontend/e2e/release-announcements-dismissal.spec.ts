import { expect, test } from "@playwright/test";
import {
  getAnnouncementDialog,
  getSameOriginJson,
  loginToAnnouncementAccount,
  RELEASE_ANNOUNCEMENT_EMAILS,
} from "./release-announcements.helpers";

test("dismisses only the popup snapshot across devices after a successful retry", async ({
  page,
  browser,
}) => {
  const dismissBodies: Array<{ release_ids: string[] }> = [];
  await page.route("**/api/release-announcement/dismiss", async (route) => {
    dismissBodies.push(route.request().postDataJSON() as { release_ids: string[] });
    if (dismissBodies.length === 1) {
      await route.fulfill({ status: 500, json: { message: "Temporary failure" } });
      return;
    }
    await route.continue();
  });

  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.dismissal);
  const dialog = await getAnnouncementDialog(page);
  const checkbox = dialog.getByLabel("ไม่แสดงอีกสำหรับเวอร์ชั่นนี้");
  await checkbox.check();
  expect(dismissBodies).toHaveLength(0);

  await dialog.getByRole("button", { name: "ปิดประกาศ" }).click();
  await expect(dialog).toBeVisible();
  await expect(checkbox).toBeChecked();
  await expect(dialog.getByRole("alert")).toContainText("บันทึกการซ่อนประกาศไม่สำเร็จ");
  await expect(dialog.getByRole("button", { name: "ปิด", exact: true })).toBeEnabled();

  await dialog.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(dismissBodies).toHaveLength(2);
  expect(dismissBodies[1].release_ids).toEqual([
    "walpaca-1.2.0",
    "walpaca-1.1.0",
    "walpaca-1.0.0",
  ]);

  const baseURL = new URL(page.url()).origin;
  const otherDevice = await browser.newContext({ baseURL });
  const otherPage = await otherDevice.newPage();
  await loginToAnnouncementAccount(otherPage, RELEASE_ANNOUNCEMENT_EMAILS.dismissal);
  await expect(otherPage.getByRole("dialog")).toHaveCount(0);
  const historyResponse = await getSameOriginJson(
    otherPage,
    "/api/release-announcement/history",
  );
  expect(historyResponse.status).toBe(200);
  const historyBody = historyResponse.body as {
    announcements: Array<{ dismissed_at: string | null }>;
  };
  expect(historyBody.announcements.every((item) => item.dismissed_at)).toBe(true);
  await otherDevice.close();

  const differentAccount = await browser.newContext({ baseURL });
  const differentPage = await differentAccount.newPage();
  await loginToAnnouncementAccount(differentPage, RELEASE_ANNOUNCEMENT_EMAILS.fresh);
  await expect(await getAnnouncementDialog(differentPage)).toBeVisible();
  await differentAccount.close();
});
