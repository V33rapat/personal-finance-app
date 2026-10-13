import { expect, test, type Page } from "@playwright/test";
import {
  ACTION_MANUAL_EXPENSE,
  ACTION_MANUAL_INCOME,
  ACTION_REPLACEMENT_TEMPLATE,
  getConfirmationDialog,
  getTransactionModal,
  getTransactionRow,
  openActionMenu,
  openTransactions,
  waitForTransactionRequest,
  waitForTransactionResponse,
} from "./transaction-action-menu.helpers";
import { dateFieldValue } from "./date-format.helpers";

function waitForTransactionMutation(page: Page, method: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.startsWith("/api/transaction") && response.request().method() === method;
  });
}

test.describe("Transaction Action Menu mutations", () => {
  test("edits a transaction through the existing modal", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, "E2E Action Edit Target");
    await (await openActionMenu(row)).menu.getByTestId("transaction-action-edit").click();

    const dialog = getTransactionModal(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("transaction-name")).toHaveValue("E2E Action Edit Target");
    await expect(dialog.getByTestId("transaction-amount")).toHaveValue("35");
    await dialog.getByTestId("transaction-name").fill("E2E Action Edited Target");

    const response = waitForTransactionMutation(page, "PATCH");
    await dialog.getByRole("button", { name: "บันทึก", exact: true }).click();
    await response;

    await expect(dialog).toBeHidden();
    await expect(getTransactionRow(page, "E2E Action Edited Target")).toBeVisible();
    await expect(getTransactionRow(page, "E2E Action Edit Target")).toHaveCount(0);
  });

  test("duplicates a transaction without copying its old template", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, ACTION_MANUAL_EXPENSE);
    await (await openActionMenu(row)).menu.getByTestId("transaction-action-duplicate").click();

    const dialog = getTransactionModal(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "ทำสำเนารายการ", exact: true })).toBeVisible();
    await expect(dialog.getByTestId("transaction-name")).toHaveValue(
      `${ACTION_MANUAL_EXPENSE} (สำเนา)`,
    );
    await expect(dialog.getByTestId("transaction-date")).toHaveValue(dateFieldValue("2026-07-19"));
    await expect(dialog.getByTestId("transaction-template")).toHaveValue("");
    await dialog.getByTestId("transaction-name").fill("E2E Action Created Copy");

    const request = waitForTransactionRequest(page, "POST", "/api/transaction");
    const response = waitForTransactionResponse(page, "POST", "/api/transaction");
    await dialog.getByRole("button", { name: "สร้างสำเนา", exact: true }).click();
    const payload = JSON.parse((await request).postData() ?? "{}");
    await response;

    expect(payload.name).toBe("E2E Action Created Copy");
    expect(payload.transaction_date).toBe("2026-07-19");
    expect(payload.template_id).toBeNull();
    expect(payload.id).toBeUndefined();
    expect(payload.created_at).toBeUndefined();
    expect(payload.management).toBeUndefined();
    await expect(dialog).toBeHidden();
    await expect(getTransactionRow(page, "E2E Action Created Copy")).toBeVisible();
  });

  test("duplicates a transaction with a newly selected template", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, ACTION_MANUAL_INCOME);
    await (await openActionMenu(row)).menu.getByTestId("transaction-action-duplicate").click();

    const dialog = getTransactionModal(page);
    const template = dialog.getByTestId("transaction-template");
    await expect(template).toBeVisible();
    const replacementValue = await template
      .locator("option")
      .filter({ hasText: ACTION_REPLACEMENT_TEMPLATE })
      .getAttribute("value");
    expect(replacementValue).toBeTruthy();
    await template.selectOption(replacementValue!);

    const request = waitForTransactionRequest(page, "POST", "/api/transaction");
    const response = waitForTransactionResponse(page, "POST", "/api/transaction");
    await dialog.getByRole("button", { name: "สร้างสำเนา", exact: true }).click();
    const payload = JSON.parse((await request).postData() ?? "{}");
    await response;

    expect(payload.template_id).toBe(replacementValue);
    expect(payload.id).toBeUndefined();
    await expect(dialog).toBeHidden();
  });

  test("saves a manual transaction as a template", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, ACTION_MANUAL_INCOME);
    const { menu } = await openActionMenu(row);
    const request = waitForTransactionRequest(page, "POST", "/api/transaction-template");
    const response = page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return url.pathname === "/api/transaction-template" && candidate.request().method() === "POST";
    });
    await menu.getByTestId("transaction-action-template").click();
    const payload = JSON.parse((await request).postData() ?? "{}");
    await response;

    expect(payload.name).toBe(ACTION_MANUAL_INCOME);
    expect(payload.default_amount).toBe(500);
    expect(payload.id).toBeUndefined();
  });

  test("cancels a single delete, then removes the target transaction", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, "E2E Action Delete Target");
    await (await openActionMenu(row)).menu.getByTestId("transaction-action-delete").click();
    const dialog = getConfirmationDialog(page);
    await expect(dialog).toContainText("E2E Action Delete Target");
    await expect(dialog).toContainText("ยอดเงินในกระเป๋าจะถูกปรับตามรายการนี้");
    await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();

    await (await openActionMenu(row)).menu.getByTestId("transaction-action-delete").click();
    const deleteResponse = waitForTransactionMutation(page, "DELETE");
    await page.getByRole("dialog").getByRole("button", { name: "ลบ", exact: true }).click();
    await deleteResponse;
    await expect(dialog).toBeHidden();
    await expect(getTransactionRow(page, "E2E Action Delete Target")).toHaveCount(0);
  });

  test("keeps the delete dialog open when the API fails, then retries", async ({ page }) => {
    let shouldFail = true;
    await page.route("**/api/transaction/**", async (route) => {
      if (route.request().method() !== "DELETE" || !shouldFail) {
        await route.continue();
        return;
      }

      shouldFail = false;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "E2E delete failure" }),
      });
    });

    await openTransactions(page);
    const row = getTransactionRow(page, "E2E Action Error Delete Target");
    await (await openActionMenu(row)).menu.getByTestId("transaction-action-delete").click();
    const dialog = getConfirmationDialog(page);
    await dialog.getByRole("button", { name: "ลบ", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("confirmation-dialog-error")).toContainText("E2E delete failure");

    const response = waitForTransactionMutation(page, "DELETE");
    await dialog.getByRole("button", { name: "ลบ", exact: true }).click();
    await response;
    await expect(dialog).toBeHidden();
    await expect(row).toHaveCount(0);
  });

  test("removes only the deleted item from bulk selection", async ({ page }) => {
    await openTransactions(page);

    const expenseRow = getTransactionRow(page, ACTION_MANUAL_EXPENSE);
    const incomeRow = getTransactionRow(page, ACTION_MANUAL_INCOME);
    await expenseRow.getByRole("button", { name: `เลือกรายการ: ${ACTION_MANUAL_EXPENSE}` }).click();
    await incomeRow.getByRole("button", { name: `เลือกรายการ: ${ACTION_MANUAL_INCOME}` }).click();
    await expect(page.getByRole("button", { name: "ลบรายการ", exact: true })).toBeVisible();

    await (await openActionMenu(expenseRow)).menu.getByTestId("transaction-action-delete").click();
    const response = waitForTransactionMutation(page, "DELETE");
    await getConfirmationDialog(page).getByRole("button", { name: "ลบ", exact: true }).click();
    await response;

    await expect(getTransactionRow(page, ACTION_MANUAL_EXPENSE)).toHaveCount(0);
    await expect(getTransactionRow(page, ACTION_MANUAL_INCOME)).toBeVisible();
    await expect(
      getTransactionRow(page, ACTION_MANUAL_INCOME).getByRole("button", {
        name: `ยกเลิกการเลือก: ${ACTION_MANUAL_INCOME}`,
      }),
    ).toBeVisible();
  });
});
