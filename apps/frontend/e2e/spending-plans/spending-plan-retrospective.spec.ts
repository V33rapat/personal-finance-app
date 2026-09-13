import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
} from "./spending-plan.helpers";

test.describe("Retrospective Spending Plans", () => {
  test("creates a completed plan in the past and replaces its same-day revision", async ({
    page,
  }, testInfo) => {
    const startDate = addDays(getBangkokToday(), -20 - testInfo.retry);
    const originalName = createPlanName("retrospective");
    const revisedName = createPlanName("retrospective-revised");

    await createPlanThroughUi(page, { name: originalName, startDate });
    await expect(
      page.getByRole("button", { name: "แก้ไขแผน", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ยกเลิกแผน", exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "แก้ไขแผน", exact: true }).click();
    await page.getByLabel("ชื่อแผน", { exact: true }).fill(revisedName);
    await page
      .getByLabel("ให้ Revision มีผลตั้งแต่", { exact: true })
      .fill(startDate);

    const request = page.waitForRequest((candidate) => {
      if (!candidate.url().includes("/api/spending-plan/") || candidate.method() !== "PATCH") {
        return false;
      }
      return !Object.hasOwn(JSON.parse(candidate.postData() ?? "{}"), "amount");
    });
    await page
      .getByRole("button", { name: "บันทึกเป็น Revision ใหม่", exact: true })
      .click();
    await request;

    await expect(
      page.getByRole("heading", { name: revisedName, exact: true }),
    ).toBeVisible();
    await expect(page.locator("details")).toHaveCount(1);
  });

  test("copies a plan into a retrospective period", async ({ page }, testInfo) => {
    const sourceName = createPlanName("retrospective-copy-source");
    const sourceStartDate = addDays(getBangkokToday(), 30 + testInfo.retry);
    const copiedStartDate = addDays(getBangkokToday(), -40 - testInfo.retry);

    await createPlanThroughUi(page, { name: sourceName, startDate: sourceStartDate });
    await page.getByRole("button", { name: "คัดลอกแผน", exact: true }).click();
    await page
      .getByLabel("วันเริ่มต้นของแผนใหม่", { exact: true })
      .fill(copiedStartDate);
    await page.getByRole("button", { name: "ยืนยันคัดลอกแผน", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: `${sourceName} (สำเนา)`, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("แก้ไขแผน", { exact: true })).toBeVisible();
  });
});
