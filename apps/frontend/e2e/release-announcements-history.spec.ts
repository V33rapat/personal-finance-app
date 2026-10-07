import { expect, test } from "@playwright/test";
import {
  authenticateAndOpenPage,
  getAnnouncementDialog,
  getReleaseCard,
  getSameOriginJson,
  loginToAnnouncementAccount,
  RELEASE_ANNOUNCEMENT_EMAILS,
  waitForAnnouncementStateRequest,
} from "./release-announcements.helpers";

test("opening the history route directly does not stack the automatic popup", async ({ page }) => {
  let popupRequests = 0;
  await page.route("**/api/release-announcement/popup", async (route) => {
    popupRequests += 1;
    await route.continue();
  });
  await authenticateAndOpenPage(
    page,
    RELEASE_ANNOUNCEMENT_EMAILS.history,
    "/whats-new",
  );

  await expect(page.getByTestId("release-announcement-history")).toBeVisible();
  await expect(page.getByTestId("release-announcement-walpaca-1.0.0")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(popupRequests).toBe(0);
});

test("history includes pre-baseline and dismissed releases and opening details only marks seen", async ({
  page,
}) => {
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.history);
  const dialog = await getAnnouncementDialog(page);
  await dialog.getByRole("button", { name: "ปิดประกาศ" }).click();
  await page.goto("/whats-new");

  await expect(page.getByRole("heading", { name: "มีอะไรใหม่", exact: true })).toBeVisible();
  await expect(page.getByTestId("release-announcement-walpaca-1.2.0")).toBeVisible();
  await expect(page.getByTestId("release-announcement-walpaca-1.1.0")).toBeVisible();
  const dismissed = page.getByTestId("release-announcement-walpaca-1.0.0");
  await expect(dismissed).toContainText("ซ่อนแล้ว");

  const seenRequest = waitForAnnouncementStateRequest(page, "seen");
  await dismissed.getByRole("button", { name: "ดูรายละเอียดเวอร์ชัน 1.0.0" }).click();
  expect((await seenRequest).postDataJSON()).toEqual({ release_ids: ["walpaca-1.0.0"] });
  await expect(dismissed).toContainText("เพิ่มรายการธุรกรรม");
  await expect(dismissed).toContainText("ซ่อนแล้ว");

  const popupResponse = await getSameOriginJson(page, "/api/release-announcement/popup");
  expect(popupResponse.status).toBe(200);
  const popupBody = popupResponse.body as { announcements: Array<{ id: string }> };
  expect(popupBody.announcements.map(({ id }) => id)).toEqual(["walpaca-1.2.0"]);
  await expect(getReleaseCard(dialog, "walpaca-1.2.0")).toBeHidden();
});
