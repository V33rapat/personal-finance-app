import { expect, test, type Page } from "@playwright/test";
import {
  clearWalletSummarySelection,
  DASHBOARD_WALLET_SUMMARY_TEXT,
  expectWalletSummaryPayload,
  getDashboardWalletSummary,
  getWalletSummaryCard,
  getWalletSummaryWalletId,
  openDashboardWalletSummary,
  openWalletSummarySettings,
  saveWalletSummarySettings,
  setWalletSummarySelection,
  waitForWalletSummaryRequest,
} from "./dashboard-wallet-summary.helpers";

const CASH_WALLET = "E2E เงินสด";
const SAVINGS_CHILD_WALLET = "E2E เงินเก็บ: E2E เงินสำรอง";
const INVESTMENT_WALLET = "E2E พอร์ตลงทุน";
const EXTRA_WALLET_ONE = "E2E Wallet Summary Extra One";
const EXTRA_WALLET_TWO = "E2E Wallet Summary Extra Two";
const PARENT_WITH_CHILDREN = "E2E เงินเก็บ";
const INACTIVE_WALLET = "E2E กระเป๋าปิด";
const DELETED_WALLET = "E2E กระเป๋าถูกลบ";
const ELIGIBLE_WALLETS = [
  CASH_WALLET,
  SAVINGS_CHILD_WALLET,
  INVESTMENT_WALLET,
  EXTRA_WALLET_ONE,
  EXTRA_WALLET_TWO,
];

async function saveSelection(page: Page, walletNames: string[]) {
  const dialog = await openWalletSummarySettings(page);
  await clearWalletSummarySelection(dialog);
  await setWalletSummarySelection(dialog, walletNames);
  const walletIds = await Promise.all(
    walletNames.map((walletName) =>
      getWalletSummaryWalletId(dialog, walletName),
    ),
  );
  const requestPromise = waitForWalletSummaryRequest(page, "PATCH");
  await saveWalletSummarySettings(dialog);

  const expectedWalletIds = walletIds.map((walletId) => {
    if (!walletId) {
      throw new Error("Wallet selector did not expose its ID.");
    }

    return walletId;
  });
  expectWalletSummaryPayload(await requestPromise, expectedWalletIds);
}

test.describe("Dashboard Wallet Summary settings", () => {
  test("saves one and multiple wallets, then keeps the selection after refresh", async ({
    page,
  }) => {
    await openDashboardWalletSummary(page);
    await saveSelection(page, [CASH_WALLET]);

    let summary = await getDashboardWalletSummary(page);
    await expect(getWalletSummaryCard(summary, CASH_WALLET)).toBeVisible();
    await expect(
      getWalletSummaryCard(summary, SAVINGS_CHILD_WALLET),
    ).toHaveCount(0);

    await page.reload();
    summary = await getDashboardWalletSummary(page);
    await expect(getWalletSummaryCard(summary, CASH_WALLET)).toBeVisible();
    await expect(summary.locator('a[href^="/wallet?walletId="]')).toHaveCount(
      1,
    );

    await saveSelection(page, [CASH_WALLET, SAVINGS_CHILD_WALLET]);
    summary = await getDashboardWalletSummary(page);
    await expect(getWalletSummaryCard(summary, CASH_WALLET)).toBeVisible();
    await expect(
      getWalletSummaryCard(summary, SAVINGS_CHILD_WALLET),
    ).toBeVisible();
  });

  test("allows saving no wallets and reopens the settings from the empty state", async ({
    page,
  }) => {
    await openDashboardWalletSummary(page);
    await saveSelection(page, []);

    const summary = await getDashboardWalletSummary(page);
    await expect(summary).toContainText(DASHBOARD_WALLET_SUMMARY_TEXT.empty);
    await expect(summary.locator('a[href^="/wallet?walletId="]')).toHaveCount(
      0,
    );

    const dialog = await openWalletSummarySettings(page);
    await expect(dialog).toContainText("เลือกแล้ว 0/4 ใบ");
  });

  test("prevents selecting a fifth wallet without sending a patch request", async ({
    page,
  }) => {
    await openDashboardWalletSummary(page);
    const dialog = await openWalletSummarySettings(page);
    await clearWalletSummarySelection(dialog);
    await setWalletSummarySelection(dialog, ELIGIBLE_WALLETS.slice(0, 4));

    let patchCount = 0;
    const onRequest = (request: {
      method: () => string;
      url: () => string;
    }) => {
      if (
        request.method() === "PATCH" &&
        new URL(request.url()).pathname === "/api/dashboard/wallet-summary"
      ) {
        patchCount += 1;
      }
    };
    page.on("request", onRequest);
    await dialog.getByLabel(EXTRA_WALLET_TWO, { exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "เลือกแสดงกระเป๋าได้สูงสุด 4 ใบ",
    );
    await page.waitForTimeout(250);
    page.off("request", onRequest);

    expect(patchCount).toBe(0);
  });

  test("searches by wallet labels and excludes unavailable wallet choices", async ({
    page,
  }) => {
    await openDashboardWalletSummary(page);
    const dialog = await openWalletSummarySettings(page);

    await expect(dialog.getByLabel(CASH_WALLET, { exact: true })).toBeVisible();
    await expect(
      dialog.getByLabel(SAVINGS_CHILD_WALLET, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByLabel(INVESTMENT_WALLET, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByLabel(PARENT_WITH_CHILDREN, { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByLabel(INACTIVE_WALLET, { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByLabel(DELETED_WALLET, { exact: true }),
    ).toHaveCount(0);

    await dialog
      .getByPlaceholder(DASHBOARD_WALLET_SUMMARY_TEXT.search)
      .fill("เงินเก็บ: E2E เงินสำรอง");
    await expect(
      dialog.getByLabel(SAVINGS_CHILD_WALLET, { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByLabel(CASH_WALLET, { exact: true })).toHaveCount(
      0,
    );

    await dialog
      .getByPlaceholder(DASHBOARD_WALLET_SUMMARY_TEXT.search)
      .fill("ไม่พบ");
    await expect(dialog).toContainText("ไม่พบกระเป๋าที่ตรงกับการค้นหา");
  });
});
