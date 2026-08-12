import { expect, test } from "@playwright/test";
import {
  createExpenseThroughUi,
  createWalletThroughUi,
  DASHBOARD_WALLET_SUMMARY_TEXT,
  expectWalletSummaryPayload,
  getWalletSummaryCard,
  getWalletSummaryCardLabels,
  openDashboardWalletSummary,
  openWalletSummarySettings,
  saveWalletSummarySettings,
  waitForWalletSummaryRequest,
} from "./dashboard-wallet-summary.helpers";

const DEFAULT_WALLETS = [
  "E2E Summary Beta ฿1,240.00",
  "E2E Summary Gamma ฿1,240.00",
  "E2E Summary Alpha ฿780.00",
  "E2E Summary Delta ฿520.00",
];
const ARCHIVED_WALLET = "E2E Summary Archived";
const NEW_WALLET = "E2E Summary Created Through UI";
const CONFIGURED_WALLET = "E2E Summary Not Added After Settings";

test.describe.serial("Dashboard Wallet Summary defaults", () => {
  test("shows four most recently active wallets sorted by balance and name", async ({
    page,
  }) => {
    const summary = await openDashboardWalletSummary(page);

    await expect(summary).toContainText("กำลังแสดงกระเป๋าที่ใช้งานล่าสุด");
    await expect(getWalletSummaryCard(summary, ARCHIVED_WALLET)).toHaveCount(0);
    expect(await getWalletSummaryCardLabels(summary)).toEqual(DEFAULT_WALLETS);
  });

  test("opens the selected wallet and the full wallet page", async ({
    page,
  }) => {
    const summary = await openDashboardWalletSummary(page);
    await getWalletSummaryCard(summary, "E2E Summary Beta").click();

    await expect(page).toHaveURL(/\/wallet\?walletId=/);
    await expect(
      page.getByRole("heading", { name: "E2E Summary Beta", exact: true }),
    ).toBeVisible();

    await page.goto("/dashboard");
    const refreshedSummary = await openDashboardWalletSummary(page);
    await refreshedSummary
      .getByRole("link", {
        name: DASHBOARD_WALLET_SUMMARY_TEXT.viewAll,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/wallet$/);
  });

  test("adds a newly active wallet to an unconfigured default summary", async ({
    page,
  }) => {
    await createWalletThroughUi(page, NEW_WALLET);
    await createExpenseThroughUi(page, NEW_WALLET, "E2E Summary Food");

    const summary = await openDashboardWalletSummary(page);
    await expect(getWalletSummaryCard(summary, NEW_WALLET)).toBeVisible();
    await expect(summary.locator('a[href^="/wallet?walletId="]')).toHaveCount(
      4,
    );

    const dialog = await openWalletSummarySettings(page);
    const checkboxes = dialog.locator('input[type="checkbox"]');
    for (let index = 0; index < (await checkboxes.count()); index += 1) {
      const checkbox = checkboxes.nth(index);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
    await dialog.getByLabel(NEW_WALLET, { exact: true }).check();
    const walletId = await dialog
      .getByLabel(NEW_WALLET, { exact: true })
      .getAttribute("value");
    if (!walletId) {
      throw new Error("Wallet selector did not expose its ID.");
    }

    const saveRequest = waitForWalletSummaryRequest(page, "PATCH");
    await saveWalletSummarySettings(dialog);
    expectWalletSummaryPayload(await saveRequest, [walletId]);

    await createWalletThroughUi(page, CONFIGURED_WALLET);
    await createExpenseThroughUi(page, CONFIGURED_WALLET, "E2E Summary Food");

    const configuredSummary = await openDashboardWalletSummary(page);
    await expect(
      getWalletSummaryCard(configuredSummary, NEW_WALLET),
    ).toBeVisible();
    await expect(
      getWalletSummaryCard(configuredSummary, CONFIGURED_WALLET),
    ).toHaveCount(0);
  });
});
