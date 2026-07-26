import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_E2E_EMAIL ?? "playwright-e2e@walpaca.test";
const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? "PlaywrightE2E!123";

test("signs in through the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: "งบใช้จ่าย" }),
  ).toBeVisible();
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
