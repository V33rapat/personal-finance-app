import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? "PlaywrightE2E!123";
const primaryEmail =
  process.env.PLAYWRIGHT_E2E_EMAIL ?? "playwright-e2e@walpaca.test";
const secondaryEmail =
  process.env.PLAYWRIGHT_E2E_SECONDARY_EMAIL ??
  "playwright-e2e-secondary@walpaca.test";

async function signInAndStore(
  page: Page,
  email: string,
  storageStatePath: string,
) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page
    .getByRole("textbox", { name: "รหัสผ่าน", exact: true })
    .fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: "งบใช้จ่าย" }),
  ).toBeVisible();
  mkdirSync(dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
}

test("signs in User A through the login page", async ({ page }) => {
  await signInAndStore(page, primaryEmail, "playwright/.auth/user-a.json");
});

test("signs in User B through the login page", async ({ page }) => {
  await signInAndStore(page, secondaryEmail, "playwright/.auth/user-b.json");
});
