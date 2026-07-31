import { expect, test } from "@playwright/test";
import {
  BUDGET_TEXT,
  expectNoOverviewRequest,
  openDashboard,
  selectBudgetPeriod,
  selectCalendarRange,
} from "./spending-budget.helpers";

const invalidRanges = [
  { label: "six days", start: "2026-07-20", end: "2026-07-25" },
  { label: "eight days", start: "2026-07-20", end: "2026-07-27" },
];

test.describe("Spending Budget weekly range validation", () => {
  for (const invalidRange of invalidRanges) {
    test(`does not request an overview for ${invalidRange.label}`, async ({
      page,
    }) => {
      await openDashboard(page);
      await selectBudgetPeriod(page, "weekly");

      const dialog = await selectCalendarRange(
        page,
        invalidRange.start,
        invalidRange.end,
      );

      await expectNoOverviewRequest(page, async () => {
        await dialog
          .getByRole("button", { name: BUDGET_TEXT.apply, exact: true })
          .click();
        await expect(dialog.getByRole("alert")).toHaveText(
          "กรุณาเลือกช่วงต่อเนื่อง 7 วัน",
        );
      });
    });
  }
});
