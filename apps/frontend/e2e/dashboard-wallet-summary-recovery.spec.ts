import { expect, test } from "@playwright/test";
import {
  clearWalletSummarySelection,
  createWalletThroughUi,
  DASHBOARD_WALLET_SUMMARY_TEXT,
  getWalletSummaryCard,
  openDashboardWalletSummary,
  openWalletSummarySettings,
  saveWalletSummarySettings,
  setWalletSummarySelection,
  waitForWalletSummaryRequest,
} from "./dashboard-wallet-summary.helpers";

const CASH_WALLET = "E2E เงินสด";
const REMOVED_WALLET = "E2E Wallet Summary Removed Through UI";

test.describe("Dashboard Wallet Summary recovery", () => {
  test("keeps a deleted wallet as unavailable until the user removes it", async ({
    page,
  }) => {
    await createWalletThroughUi(page, REMOVED_WALLET);
    const summary = await openDashboardWalletSummary(page);
    const settings = await openWalletSummarySettings(page);
    await clearWalletSummarySelection(settings);
    await setWalletSummarySelection(settings, [REMOVED_WALLET]);
    const saveRequest = waitForWalletSummaryRequest(page, "PATCH");
    await saveWalletSummarySettings(settings);
    await saveRequest;

    await getWalletSummaryCard(summary, REMOVED_WALLET).click();
    await page.getByRole("button", { name: "ลบ", exact: true }).click();
    const confirmation = page
      .getByText("ลบกระเป๋า?", { exact: true })
      .locator("xpath=../../..");
    const deleteRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.startsWith("/api/wallet/") && request.method() === "DELETE"
      );
    });
    await confirmation.getByRole("button", { name: "ลบ", exact: true }).click();
    await deleteRequest;
    await expect(confirmation).toBeHidden();

    const refreshedSummary = await openDashboardWalletSummary(page);
    await expect(
      getWalletSummaryCard(refreshedSummary, REMOVED_WALLET),
    ).toHaveCount(0);

    const unavailableSettings = await openWalletSummarySettings(page);
    await expect(unavailableSettings).toContainText(
      DASHBOARD_WALLET_SUMMARY_TEXT.unavailable,
    );
    await unavailableSettings
      .getByRole("button", {
        name: `${DASHBOARD_WALLET_SUMMARY_TEXT.remove} ${REMOVED_WALLET}`,
        exact: true,
      })
      .click();
    await expect(unavailableSettings).not.toContainText(
      DASHBOARD_WALLET_SUMMARY_TEXT.unavailable,
    );

    const removeRequest = waitForWalletSummaryRequest(page, "PATCH");
    await saveWalletSummarySettings(unavailableSettings);
    await removeRequest;
  });

  test("retries a failed load and keeps the dialog open when saving fails", async ({
    page,
  }) => {
    let loadCount = 0;
    await page.route("**/api/dashboard/wallet-summary", async (route) => {
      const request = route.request();

      if (request.method() === "GET" && loadCount === 0) {
        loadCount += 1;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "E2E wallet summary load failed" }),
        });
        return;
      }

      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "E2E wallet summary save failed" }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("alert").filter({
        hasText: "E2E wallet summary load failed",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ลองใหม่", exact: true }).click();

    await openDashboardWalletSummary(page);

    const settings = await openWalletSummarySettings(page);
    await settings.getByLabel(CASH_WALLET, { exact: true }).check();
    await settings
      .getByRole("button", {
        name: DASHBOARD_WALLET_SUMMARY_TEXT.save,
        exact: true,
      })
      .click();

    await expect(settings).toBeVisible();
    await expect(settings.getByRole("alert")).toContainText(
      "E2E wallet summary save failed",
    );
    await expect(
      settings.getByLabel(CASH_WALLET, { exact: true }),
    ).toBeChecked();
  });

  test("redirects an unauthenticated browser context to login", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale: "th-TH",
      timezoneId: "Asia/Bangkok",
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);

    await context.close();
  });
});
