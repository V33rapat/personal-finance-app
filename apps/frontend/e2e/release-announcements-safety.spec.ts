import { expect, test } from "@playwright/test";
import {
  authenticateAndOpenPage,
  getAnnouncementDialog,
  loginToAnnouncementAccount,
  RELEASE_ANNOUNCEMENT_EMAILS,
} from "./release-announcements.helpers";

test("shows the popup when a user first enters Wallet after login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await authenticateAndOpenPage(page, RELEASE_ANNOUNCEMENT_EMAILS.safety, "/wallet");
  await expect(page).toHaveURL(/\/wallet$/);
  await getAnnouncementDialog(page);
});

test("a popup API failure does not block the authenticated page", async ({ page }) => {
  await page.route("**/api/release-announcement/popup", (route) =>
    route.fulfill({ status: 500, json: { message: "Unavailable" } }),
  );
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.safety);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "แดชบอร์ด", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("history shows a retry state and loads successfully after retry", async ({ page }) => {
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.safety);
  const dialog = await getAnnouncementDialog(page);
  await dialog.getByRole("button", { name: "ปิดประกาศ" }).click();

  let historyRequests = 0;
  await page.route("**/api/release-announcement/history", async (route) => {
    historyRequests += 1;
    if (historyRequests === 1) {
      await route.fulfill({ status: 500, json: { message: "Temporary failure" } });
      return;
    }
    await route.continue();
  });
  await page.goto("/whats-new");
  await expect(page.getByText("โหลดประวัติการอัปเดตไม่สำเร็จ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ลองใหม่", exact: true }).click();
  await expect(page.getByTestId("release-announcement-walpaca-1.0.0")).toBeVisible();
  expect(historyRequests).toBe(2);
});

test("an open transaction modal prevents the automatic popup from stealing focus", async ({
  page,
}) => {
  let notifyPopupRequest: () => void = () => undefined;
  const popupRequestStarted = new Promise<void>((resolve) => {
    notifyPopupRequest = resolve;
  });
  let continuePopupResponse: () => void = () => undefined;
  const popupResponseGate = new Promise<void>((resolve) => {
    continuePopupResponse = resolve;
  });

  await page.route("**/api/release-announcement/popup", async (route) => {
    notifyPopupRequest();
    await popupResponseGate;
    await route.continue();
  });
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.safety, {
    waitForPopupResponse: false,
  });
  await popupRequestStarted;
  await page.getByRole("link", { name: "รายการ", exact: true }).click();
  const addTransactionButton = page.getByRole("button", {
    name: "เพิ่มรายการ",
    exact: true,
  });
  await expect(addTransactionButton).toBeEnabled();
  await addTransactionButton.click();
  const transactionDialog = page.getByTestId("transaction-modal");
  await expect(transactionDialog).toBeVisible();

  const popupResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/release-announcement/popup",
  );
  continuePopupResponse();
  await popupResponse;
  await page.waitForTimeout(800);
  await expect(transactionDialog).toBeVisible();
  await expect(page.getByRole("dialog", { name: "อัปเดตใหม่จาก Walpaca" })).toHaveCount(0);
});
