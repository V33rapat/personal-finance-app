import { expect, test } from "@playwright/test";
import {
  getAnnouncementDialog,
  getReleaseCard,
  getReleaseCards,
  loginToAnnouncementAccount,
  RELEASE_ANNOUNCEMENT_EMAILS,
  waitForAnnouncementStateRequest,
} from "./release-announcements.helpers";

test("groups the missed releases and keeps the popup snapshot stable while reading", async ({
  page,
}) => {
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.missed);
  const dialog = await getAnnouncementDialog(page);

  await expect(dialog.getByRole("heading", { name: "ใหม่", exact: true })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "เคยดูแล้ว", exact: true })).toBeVisible();
  await expect(getReleaseCards(dialog)).toHaveCount(3);
  await expect(getReleaseCard(dialog, "walpaca-1.2.0").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(getReleaseCard(dialog, "walpaca-1.0.0").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  const seenRequest = waitForAnnouncementStateRequest(page, "seen");
  await getReleaseCard(dialog, "walpaca-1.1.0")
    .getByRole("button", { name: "ดูรายละเอียดเวอร์ชัน 1.1.0" })
    .click();
  expect((await seenRequest).postDataJSON()).toEqual({
    release_ids: ["walpaca-1.1.0"],
  });
  await expect(getReleaseCard(dialog, "walpaca-1.1.0")).toContainText("ปรับปรุงแดชบอร์ด");
  await expect(
    dialog
      .getByRole("region", { name: "ใหม่" })
      .getByTestId("release-announcement-walpaca-1.1.0"),
  ).toBeVisible();
});

test("temporary close survives navigation and refresh but a duplicate tab shows announcements again", async ({
  page,
}) => {
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.missed);
  let dialog = await getAnnouncementDialog(page);
  await dialog.getByRole("button", { name: "ปิดประกาศ" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/transactions");
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.route("**/api/release-announcement/popup", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      announcements: Array<Record<string, unknown>>;
    };
    await route.fulfill({
      response,
      json: {
        ...body,
        announcements: [
          {
            id: "walpaca-1.3.0",
            version: "1.3.0",
            release_order: 4,
            published_at: "2026-10-05T00:00:00.000Z",
            title: "Walpaca 1.3.0",
            summary: "ประกาศใหม่หลังจากปิดชุดก่อนหน้า",
            updates: {
              features: [{ text: "เพิ่มรายการใหม่" }],
              improvements: [],
              fixes: [],
            },
            seen_at: null,
            dismissed_at: null,
            display_state: "new",
          },
          ...body.announcements,
        ],
      },
    });
  });
  await page.route("**/api/release-announcement/seen", async (route) => {
    const payload = route.request().postDataJSON() as { release_ids: string[] };
    if (payload.release_ids.includes("walpaca-1.3.0")) {
      await route.fulfill({ status: 201, json: { success: true } });
      return;
    }
    await route.continue();
  });
  await page.reload();

  dialog = await getAnnouncementDialog(page);
  await expect(getReleaseCard(dialog, "walpaca-1.3.0")).toBeVisible();
  await expect(getReleaseCard(dialog, "walpaca-1.2.0")).toHaveCount(0);

  await dialog.getByRole("button", { name: "ปิดประกาศ" }).click();
  await expect(dialog).toBeHidden();
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.id = "e2e-opener-tab";
    link.href = "/transactions";
    link.target = "_blank";
    link.textContent = "เปิดแท็บทดสอบ";
    document.body.append(link);
  });
  const duplicatePagePromise = page.context().waitForEvent("page");
  await page.locator("#e2e-opener-tab").click();
  const duplicatePage = await duplicatePagePromise;
  await duplicatePage.waitForURL("**/transactions");
  dialog = await getAnnouncementDialog(duplicatePage);
  await expect(getReleaseCards(dialog)).toHaveCount(3);
  await duplicatePage.close();
});
