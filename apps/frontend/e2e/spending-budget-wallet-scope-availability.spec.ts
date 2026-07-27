import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  WALLET_SCOPE_TEXT,
  expectWalletScopePayload,
  fillBudgetForm,
  getWalletCheckbox,
  getManagedBudgetRow,
  openBudgetCreateForm,
  openBudgetManagement,
  saveNewBudget,
  selectWalletScope,
  selectWallets,
  waitForBudgetMutation,
} from "./spending-budget-wallet-scope.helpers";
import {
  applyCalendarSelection,
  getBangkokToday,
  openDashboard,
  openPeriodPicker,
  selectCalendarDate,
} from "./spending-budget.helpers";

const EDIT_BUDGET_NAME = "E2E งบอาหารก่อนตัดกระเป๋า";
const DYNAMIC_ALL_BUDGET_NAME = "E2E งบทุกกระเป๋าแบบ dynamic";
const DYNAMIC_SELECTED_BUDGET_NAME = "E2E งบเลือกกระเป๋าแบบ static";
const DYNAMIC_WALLET_NAME = "E2E กระเป๋าที่สร้างจาก UI";
const UNAVAILABLE_WALLET_NAME = "E2E กระเป๋าที่ลบจาก UI";
const UNAVAILABLE_BUDGET_NAME = "E2E งบกระเป๋าที่ถูกลบ";

function getBudgetCard(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=../../..");
}

async function closeManagementDialog(dialog: Locator) {
  await dialog.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function selectDailyDate(page: Page, date: string) {
  const picker = await openPeriodPicker(page, "daily");
  await selectCalendarDate(picker, "daily", date);
  await applyCalendarSelection(picker);
}

async function createWalletThroughUi(page: Page, name: string) {
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

async function createExpenseThroughUi(
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
  await expect(walletSelect).toBeVisible();
  const walletId = await walletSelect.locator("option").evaluateAll(
    (options, expectedWalletName) => {
      const walletOption = options.find(
        (option): option is HTMLOptionElement =>
          option instanceof HTMLOptionElement &&
          option.textContent?.includes(expectedWalletName),
      );

      return walletOption?.value ?? null;
    },
    walletName,
  );

  if (!walletId) {
    throw new Error(`Missing transaction wallet option: ${walletName}`);
  }

  await walletSelect.selectOption(walletId);
  await modal.locator('input[type="text"]').first().fill("E2E รายจ่ายจาก UI");
  await modal.locator('input[type="number"]').fill("50");
  await modal.getByPlaceholder("เลือกหมวดหมู่").fill(categoryName);
  await modal.getByRole("button", { name: categoryName, exact: true }).click();
  await modal.locator('input[type="date"]').fill(getBangkokToday());

  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/transaction" && request.method() === "POST";
  });
  await modal.getByRole("button", { name: "บันทึก", exact: true }).click();
  await requestPromise;
  await expect(modal).toBeHidden();
}

test.describe("Spending Budget wallet availability and reporting", () => {
  test("shows only eligible transaction wallets and validates an empty selected scope", async ({ page }) => {
    await openDashboard(page);
    const managementDialog = await openBudgetManagement(page);
    await expect(managementDialog).not.toContainText("E2E งบของ User B");
    await closeManagementDialog(managementDialog);

    const dialog = await openBudgetCreateForm(page);
    await fillBudgetForm(dialog, {
      name: "E2E งบทดสอบตัวกรองกระเป๋า",
      category: WALLET_SCOPE_TEXT.food,
      period: "yearly",
    });
    await selectWalletScope(dialog, "selected");

    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.cash)).toBeVisible();
    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.savingsChild)).toBeVisible();
    await expect(
      getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.savingsParent),
    ).toHaveCount(0);
    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.investment)).toHaveCount(0);
    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.inactive)).toHaveCount(0);
    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.deleted)).toHaveCount(0);

    await dialog.getByPlaceholder(WALLET_SCOPE_TEXT.walletSearch).fill("สำรอง");
    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.savingsChild)).toBeVisible();
    await expect(getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.cash)).toHaveCount(0);
    await dialog.getByPlaceholder(WALLET_SCOPE_TEXT.walletSearch).fill("");

    let mutationCount = 0;
    const onRequest = (request: { method: () => string; url: () => string }) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/spending-budget"
      ) {
        mutationCount += 1;
      }
    };
    page.on("request", onRequest);
    await saveNewBudget(dialog);
    await expect(dialog.getByRole("alert")).toContainText(
      "กรุณาเลือกกระเป๋าอย่างน้อย 1 ใบ",
    );
    await page.waitForTimeout(250);
    page.off("request", onRequest);

    expect(mutationCount).toBe(0);
  });

  test("updates selected wallets and refreshes the reported spending", async ({ page }) => {
    await openDashboard(page);
    const createDialog = await openBudgetCreateForm(page);
    await fillBudgetForm(createDialog, {
      name: EDIT_BUDGET_NAME,
      category: WALLET_SCOPE_TEXT.food,
    });
    await selectWalletScope(createDialog, "selected");
    await selectWallets(createDialog, [
      WALLET_SCOPE_TEXT.cash,
      WALLET_SCOPE_TEXT.savingsChild,
    ]);

    const createRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(createDialog);
    expectWalletScopePayload(await createRequestPromise, "selected", 2);

    const managementDialog = await openBudgetManagement(page);
    const budgetRow = getManagedBudgetRow(managementDialog, EDIT_BUDGET_NAME);
    await budgetRow.getByRole("button", { name: "แก้ไข", exact: true }).click();

    const editDialog = page.getByRole("dialog", { name: "แก้ไขงบใช้จ่าย" });
    await expect(getWalletCheckbox(editDialog, WALLET_SCOPE_TEXT.cash)).toBeChecked();
    await expect(
      getWalletCheckbox(editDialog, WALLET_SCOPE_TEXT.savingsChild),
    ).toBeChecked();

    await closeManagementDialog(editDialog);
    await selectDailyDate(page, "2026-07-20");
    await expect(getBudgetCard(page, EDIT_BUDGET_NAME)).toContainText("฿200.00");

    const reopenedManagement = await openBudgetManagement(page);
    const reopenedRow = getManagedBudgetRow(reopenedManagement, EDIT_BUDGET_NAME);
    await reopenedRow.getByRole("button", { name: "แก้ไข", exact: true }).click();

    const reopenedEditDialog = page.getByRole("dialog", {
      name: "แก้ไขงบใช้จ่าย",
    });
    await getWalletCheckbox(reopenedEditDialog, WALLET_SCOPE_TEXT.savingsChild).uncheck();

    const updateRequestPromise = waitForBudgetMutation(page, "PATCH");
    await reopenedEditDialog
      .getByRole("button", { name: "บันทึกการแก้ไข", exact: true })
      .click();
    expectWalletScopePayload(await updateRequestPromise, "selected", 1);

    await closeManagementDialog(await openBudgetManagement(page));
    await expect(getBudgetCard(page, EDIT_BUDGET_NAME)).toContainText("฿120.00");
  });

  test("keeps all-wallet budgets dynamic while selected budgets stay limited", async ({ page }) => {
    await openDashboard(page);
    const allDialog = await openBudgetCreateForm(page);
    await fillBudgetForm(allDialog, {
      name: DYNAMIC_ALL_BUDGET_NAME,
      category: WALLET_SCOPE_TEXT.leisure,
      amount: "300",
    });
    const allRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(allDialog);
    expectWalletScopePayload(await allRequestPromise, "all", 0);

    await createWalletThroughUi(page, DYNAMIC_WALLET_NAME);
    await createExpenseThroughUi(
      page,
      DYNAMIC_WALLET_NAME,
      WALLET_SCOPE_TEXT.leisure,
    );

    await openDashboard(page);
    await expect(getBudgetCard(page, DYNAMIC_ALL_BUDGET_NAME)).toContainText("฿50.00");

    const selectedDialog = await openBudgetCreateForm(page);
    await fillBudgetForm(selectedDialog, {
      name: DYNAMIC_SELECTED_BUDGET_NAME,
      category: WALLET_SCOPE_TEXT.leisure,
      amount: "300",
    });
    await selectWalletScope(selectedDialog, "selected");
    await selectWallets(selectedDialog, [WALLET_SCOPE_TEXT.cash]);
    const selectedRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(selectedDialog);
    expectWalletScopePayload(await selectedRequestPromise, "selected", 1);

    await closeManagementDialog(await openBudgetManagement(page));
    await expect(getBudgetCard(page, DYNAMIC_SELECTED_BUDGET_NAME)).toContainText("฿0.00");
  });

  test("keeps an unavailable selected wallet visible until the user replaces it", async ({ page }) => {
    await createWalletThroughUi(page, UNAVAILABLE_WALLET_NAME);

    await openDashboard(page);
    const createDialog = await openBudgetCreateForm(page);
    await fillBudgetForm(createDialog, {
      name: UNAVAILABLE_BUDGET_NAME,
      category: WALLET_SCOPE_TEXT.food,
      period: "monthly",
    });
    await selectWalletScope(createDialog, "selected");
    await selectWallets(createDialog, [UNAVAILABLE_WALLET_NAME]);
    const createRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(createDialog);
    expectWalletScopePayload(await createRequestPromise, "selected", 1);

    await page.goto("/wallet");
    await page
      .getByRole("button", { name: new RegExp(`^${UNAVAILABLE_WALLET_NAME}`) })
      .click();
    await expect(
      page.getByRole("heading", { name: UNAVAILABLE_WALLET_NAME, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "ลบ", exact: true }).click();
    const confirmDialog = page
      .getByText("ลบกระเป๋า?", { exact: true })
      .locator("xpath=../../..");
    await confirmDialog.getByRole("button", { name: "ลบ", exact: true }).click();
    await expect(confirmDialog).toBeHidden();
    await expect(
      page.getByRole("heading", { name: UNAVAILABLE_WALLET_NAME, exact: true }),
    ).toBeHidden();

    await openDashboard(page);
    const managementDialog = await openBudgetManagement(page);
    const budgetRow = getManagedBudgetRow(managementDialog, UNAVAILABLE_BUDGET_NAME);
    await expect(budgetRow).toContainText("มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน 1 ใบ");
    await budgetRow.getByRole("button", { name: "แก้ไข", exact: true }).click();

    const editDialog = page.getByRole("dialog", { name: "แก้ไขงบใช้จ่าย" });
    await expect(editDialog).toContainText("มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน");
    await editDialog
      .getByRole("button", {
        name: `นำกระเป๋าออก: ${UNAVAILABLE_WALLET_NAME}`,
        exact: true,
      })
      .click();
    await expect(editDialog).not.toContainText("มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน");

    await selectWallets(editDialog, [WALLET_SCOPE_TEXT.cash]);
    const updateRequestPromise = waitForBudgetMutation(page, "PATCH");
    await editDialog
      .getByRole("button", { name: "บันทึกการแก้ไข", exact: true })
      .click();
    expectWalletScopePayload(await updateRequestPromise, "selected", 1);

    const updatedManagementDialog = await openBudgetManagement(page);
    const updatedRow = getManagedBudgetRow(
      updatedManagementDialog,
      UNAVAILABLE_BUDGET_NAME,
    );
    await expect(updatedRow).not.toContainText("มีกระเป๋าที่เลือกไว้ไม่พร้อมใช้งาน");
  });
});
