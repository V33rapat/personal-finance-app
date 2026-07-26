import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_E2E_EMAIL ?? "playwright-e2e@walpaca.test";
const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? "PlaywrightE2E!123";
const storageStatePath = "playwright/.auth/user.json";

test("signs in through the login page", async ({ page }) => {
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
});
