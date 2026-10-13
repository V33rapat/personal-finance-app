import {
  expect,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test";
import { getBangkokToday, openDashboard } from "./spending-budget.helpers";
import { dateFieldValue } from "./date-format.helpers";

export const DASHBOARD_WALLET_SUMMARY_TEXT = {
  heading: "กระเป๋าของคุณ",
  configure: "ตั้งค่ากระเป๋าที่แสดง",
  save: "บันทึกการตั้งค่า",
  cancel: "ยกเลิก",
  search: "ค้นหากระเป๋า",
  viewAll: "ดูกระเป๋าทั้งหมด",
  empty: "ยังไม่ได้เลือกกระเป๋าที่จะแสดง",
  unavailable: "กระเป๋าที่ไม่พร้อมใช้งาน",
  remove: "นำกระเป๋าออกจากการแสดง",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getDashboardWalletSummary(page: Page) {
  const heading = page.getByRole("heading", {
    name: DASHBOARD_WALLET_SUMMARY_TEXT.heading,
    exact: true,
  });

  await expect(heading).toBeVisible();
  return heading.locator("xpath=ancestor::section");
}

export async function openDashboardWalletSummary(page: Page) {
  await openDashboard(page);
  return getDashboardWalletSummary(page);
}

export function getWalletSummaryCard(section: Locator, walletName: string) {
  return section.getByRole("link", {
    name: new RegExp(`^${escapeRegExp(walletName)} `),
  });
}

export async function getWalletSummaryCardLabels(section: Locator) {
  return section
    .locator('a[href^="/wallet?walletId="]')
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("aria-label")),
    );
}

export async function openWalletSummarySettings(page: Page) {
  const section = await getDashboardWalletSummary(page);
  await section
    .getByRole("button", {
      name: DASHBOARD_WALLET_SUMMARY_TEXT.configure,
      exact: true,
    })
    .click();

  const dialog = page.getByRole("dialog", {
    name: DASHBOARD_WALLET_SUMMARY_TEXT.configure,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

export function getWalletSummaryCheckbox(dialog: Locator, walletName: string) {
  return dialog.getByLabel(walletName, { exact: true });
}

export async function setWalletSummarySelection(
  dialog: Locator,
  walletNames: string[],
) {
  for (const walletName of walletNames) {
    const checkbox = getWalletSummaryCheckbox(dialog, walletName);
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }
}

export async function clearWalletSummarySelection(
  dialog: Locator,
  walletNames: string[],
) {
  for (const walletName of walletNames) {
    const checkbox = getWalletSummaryCheckbox(dialog, walletName);
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }
}

export async function getWalletSummaryWalletId(
  dialog: Locator,
  walletName: string,
) {
  return getWalletSummaryCheckbox(dialog, walletName).getAttribute("value");
}

export async function saveWalletSummarySettings(dialog: Locator) {
  await dialog
    .getByRole("button", {
      name: DASHBOARD_WALLET_SUMMARY_TEXT.save,
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
}

export async function waitForWalletSummaryRequest(
  page: Page,
  method: "GET" | "PATCH",
) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname === "/api/dashboard/wallet-summary" &&
      request.method() === method
    );
  });
}

export function expectWalletSummaryPayload(
  request: Request,
  expectedWalletIds: string[],
) {
  const payload = request.postDataJSON() as { wallet_ids?: unknown[] };
  expect(payload.wallet_ids).toEqual(expectedWalletIds);
}

export async function createWalletThroughUi(page: Page, name: string) {
  await page.goto("/wallet");
  await page
    .getByRole("button", { name: "สร้างกระเป๋า", exact: true })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "สร้างกระเป๋า" });
  await dialog.getByLabel("ชื่อกระเป๋า").fill(name);

  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/wallet" && request.method() === "POST";
  });
  await dialog
    .getByRole("button", { name: "สร้างกระเป๋า", exact: true })
    .click();
  await requestPromise;
  await expect(dialog).toBeHidden();
}

export async function createExpenseThroughUi(
  page: Page,
  walletName: string,
  categoryName: string,
) {
  await page.goto("/transactions");
  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();

  const modal = page
    .getByRole("heading", { name: "เพิ่มรายการ", exact: true })
    .locator("xpath=../..");
  const walletSelect = modal.locator("select").first();
  const walletId = await walletSelect
    .locator("option")
    .evaluateAll(
      (options, expectedWalletName) =>
        options.find(
          (option): option is HTMLOptionElement =>
            option instanceof HTMLOptionElement &&
            option.textContent?.includes(expectedWalletName),
        )?.value ?? null,
      walletName,
    );

  if (!walletId) {
    throw new Error(`Missing transaction wallet option: ${walletName}`);
  }

  await walletSelect.selectOption(walletId);
  await modal
    .locator('input[type="text"]')
    .first()
    .fill("E2E summary activity");
  await modal.locator('input[type="number"]').fill("50");
  await modal.getByPlaceholder("เลือกหมวดหมู่").fill(categoryName);
  await modal.getByRole("button", { name: categoryName, exact: true }).click();
  await modal.getByTestId("transaction-date").fill(dateFieldValue(getBangkokToday()));

  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/transaction" && request.method() === "POST";
  });
  await modal.getByRole("button", { name: "บันทึก", exact: true }).click();
  await requestPromise;
  await expect(modal).toBeHidden();
}
