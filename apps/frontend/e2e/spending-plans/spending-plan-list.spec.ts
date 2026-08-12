import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
  openPlans,
} from "./spending-plan.helpers";

test.describe("Spending Plan list", () => {
  test("lists a newly created plan and opens its detail page", async ({ page }) => {
    const name = createPlanName("list");
    await createPlanThroughUi(page, {
      name,
      startDate: addDays(getBangkokToday(), 2),
    });

    await openPlans(page);
    const planCard = page.getByRole("link", { name: new RegExp(name) });
    await expect(planCard).toBeVisible();
    await planCard.click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  });

  test("offers the create-plan action from the list", async ({ page }) => {
    await openPlans(page);
    await page.getByRole("link", { name: "สร้างแผน", exact: true }).click();
    await expect(page).toHaveURL("/spending-plans/new");
  });
});
