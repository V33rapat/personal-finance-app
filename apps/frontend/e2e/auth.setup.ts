import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? "PlaywrightE2E!123";
const primaryEmail =
  process.env.PLAYWRIGHT_E2E_EMAIL ?? "playwright-e2e@walpaca.test";
const secondaryEmail =
  process.env.PLAYWRIGHT_E2E_SECONDARY_EMAIL ??
  "playwright-e2e-secondary@walpaca.test";
const defaultSummaryEmail =
  process.env.PLAYWRIGHT_E2E_DEFAULT_SUMMARY_EMAIL ??
  "playwright-dashboard-summary@walpaca.test";
const dailyEmail =
  process.env.PLAYWRIGHT_E2E_DAILY_EMAIL ?? "playwright-e2e-daily@walpaca.test";

async function signInAndStore(
  page: Page,
  email: string,
  storageStatePath: string,
) {
  await page.goto("/login");
  const emailInput = page.getByLabel("อีเมล");
  const passwordInput = page.getByRole("textbox", {
    name: "รหัสผ่าน",
    exact: true,
  });
  const submitButton = page.getByRole("button", { name: "เข้าสู่ระบบ" });

  await emailInput.click();
  await emailInput.pressSequentially(email);
  await passwordInput.click();
  await passwordInput.pressSequentially(password);
  await passwordInput.press("Tab");
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "งบใช้จ่าย" })).toBeVisible();
  mkdirSync(dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
}

test("signs in User A through the login page", async ({ page }) => {
  await signInAndStore(page, primaryEmail, "playwright/.auth/user-a.json");
});

test("signs in User B through the login page", async ({ page }) => {
  await signInAndStore(page, secondaryEmail, "playwright/.auth/user-b.json");
});

test("signs in User C through the login page", async ({ page }) => {
  await signInAndStore(
    page,
    defaultSummaryEmail,
    "playwright/.auth/user-c.json",
  );
});

test("signs in Daily Transaction View user through the login page", async ({
  page,
}) => {
  await signInAndStore(page, dailyEmail, "playwright/.auth/user-daily.json");
});
