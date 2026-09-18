import { expect, test } from "@playwright/test";
import {
  DAILY_DATE,
  addDays,
  expectSummary,
  getBangkokToday,
  getDailyRow,
  openDailyTransactions,
  selectDailyDate,
  waitForDailyRequest,
} from "./wallet-daily.helpers";
import {
  CREATE_DATE,
  fillTransactionModal,
  openDailyTransactionModal,
  saveTransactionModal,
} from "./wallet-daily-mutations.helpers";
import { openActionMenu } from "./transaction-action-menu.helpers";

test.describe("Daily Transaction View mutations and managed transactions", () => {
  test("creates a historical transaction with the selected date and refreshes its summary", async ({ page }) => {
    const createdName = "E2E Daily Historical Create";

    await openDailyTransactions(page);
    await selectDailyDate(page, CREATE_DATE);
    const dialog = await openDailyTransactionModal(page);
    await expect(dialog.getByTestId("transaction-date")).toHaveValue(CREATE_DATE);
    await fillTransactionModal(dialog, {
      name: createdName,
      amount: "75",
      date: CREATE_DATE,
      category: "E2E Daily Food",
      note: "E2E historical create",
    });

    const dailyReload = waitForDailyRequest(page, { date: CREATE_DATE });
    await saveTransactionModal(page, dialog);
    await dailyReload;
    await expect(getDailyRow(page, createdName)).toBeVisible();
    await expectSummary(page, 0, 75);
  });

  test("moves an edited transaction to another day and refreshes both summaries", async ({ page }) => {
    const sourceDate = "2026-07-22";
    const destinationDate = "2026-07-23";
    const name = "E2E Daily Move Between Dates";

    await openDailyTransactions(page);
    await selectDailyDate(page, sourceDate);
    const createDialog = await openDailyTransactionModal(page);
    await fillTransactionModal(createDialog, {
      name,
      amount: "40",
      date: sourceDate,
      category: "E2E Daily Travel",
      note: "E2E move transaction",
    });
    const sourceReloadAfterCreate = waitForDailyRequest(page, { date: sourceDate });
    await saveTransactionModal(page, createDialog);
    await sourceReloadAfterCreate;
    await expectSummary(page, 0, 40);

    const row = getDailyRow(page, name);
    await (await openActionMenu(row)).menu.getByTestId("transaction-action-edit").click();
    const editDialog = page.getByTestId("transaction-modal");
    await expect(editDialog.getByTestId("transaction-date")).toHaveValue(sourceDate);
    await editDialog.getByTestId("transaction-date").fill(destinationDate);

    const patchRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname.startsWith("/api/transaction/") && request.method() === "PATCH";
    });
    const sourceReloadAfterMove = waitForDailyRequest(page, { date: sourceDate });
    await editDialog.getByRole("button", { name: "บันทึก", exact: true }).click();
    await patchRequest;
    await sourceReloadAfterMove;
    await expect(getDailyRow(page, name)).toHaveCount(0);
    await expectSummary(page, 0, 0);

    await selectDailyDate(page, destinationDate);
    await expect(getDailyRow(page, name)).toBeVisible();
    await expectSummary(page, 0, 40);
  });

  test("shows an inline error for a future transaction date without sending a create request", async ({ page }) => {
    const today = getBangkokToday();
    const tomorrow = addDays(today, 1);
    let createRequests = 0;
    const requestListener = (request: { method: () => string; url: () => string }) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/transaction"
      ) {
        createRequests += 1;
      }
    };

    await openDailyTransactions(page);
    const dialog = await openDailyTransactionModal(page);
    await expect(dialog.getByTestId("transaction-date")).toHaveAttribute("max", today);
    await fillTransactionModal(dialog, {
      name: "E2E Future Transaction",
      amount: "25",
      date: tomorrow,
    });

    page.on("request", requestListener);
    await dialog.getByRole("button", { name: "บันทึก", exact: true }).click();
    await expect(dialog).toContainText("วันที่ทำรายการต้องไม่เกินวันนี้");
    await page.waitForTimeout(250);
    page.off("request", requestListener);

    expect(createRequests).toBe(0);
  });

  test("marks transfer and allocation rows as read-only while including both in the daily summary", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, DAILY_DATE);

    const transferRow = getDailyRow(page, "E2E Managed Transfer Expense");
    const allocationRow = getDailyRow(page, "E2E Managed Allocation Expense");
    await expect(transferRow).toHaveAttribute("data-management", "transfer");
    await expect(allocationRow).toHaveAttribute("data-management", "allocation");
    await expect(transferRow).toContainText("จัดการจากการโอนเงิน");
    await expect(allocationRow).toContainText("จัดการจากการจัดสรรเงิน");
    await expect(transferRow.getByRole("button")).toHaveCount(0);
    await expect(allocationRow.getByRole("button")).toHaveCount(0);
    await expectSummary(page, 2_000, 610);
  });

  test("bulk deletes only manual transactions and refreshes the list, summary, and wallet balance", async ({ page }) => {
    const date = "2026-07-25";
    const firstName = "E2E Daily Bulk Delete One";
    const secondName = "E2E Daily Bulk Delete Two";

    await openDailyTransactions(page);
    await selectDailyDate(page, date);
    const walletButton = page.getByRole("button", { name: /^E2E Daily Wallet/ });
    const startingBalance = await walletButton.textContent();
    expect(startingBalance).not.toBeNull();

    for (const [name, amount] of [
      [firstName, "10"],
      [secondName, "20"],
    ]) {
      const dialog = await openDailyTransactionModal(page);
      await fillTransactionModal(dialog, {
        name,
        amount,
        date,
        category: "E2E Daily Food",
      });
      const reload = waitForDailyRequest(page, { date });
      await saveTransactionModal(page, dialog);
      await reload;
    }

    await expectSummary(page, 0, 30);
    await getDailyRow(page, firstName).getByRole("button", { name: new RegExp(`${firstName}$`) }).click();
    await getDailyRow(page, secondName).getByRole("button", { name: new RegExp(`${secondName}$`) }).click();

    await page.getByRole("button", { name: "ลบรายการ", exact: true }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    const deleteReload = waitForDailyRequest(page, { date });
    await confirmDialog.getByRole("button", { name: "ลบ", exact: true }).click();
    await deleteReload;
    await expect(getDailyRow(page, firstName)).toHaveCount(0);
    await expect(getDailyRow(page, secondName)).toHaveCount(0);
    await expectSummary(page, 0, 0);
    await expect.poll(() => walletButton.textContent()).toBe(startingBalance);
  });
});
