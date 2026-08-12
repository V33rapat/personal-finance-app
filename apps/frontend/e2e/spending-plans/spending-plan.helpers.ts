import { expect, type Page } from "@playwright/test";

export function getBangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}`;
}

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function createPlanName(suffix: string) {
  return `E2E Spending Plan ${suffix} ${Date.now()}`;
}

export async function createPlanThroughUi(
  page: Page,
  options: { name: string; startDate: string },
) {
  await page.goto("/spending-plans/new");
  await expect(
    page.getByRole("heading", { name: "สร้างแผนใหม่", exact: true }),
  ).toBeVisible();

  await page.getByLabel("ชื่อแผน", { exact: true }).fill(options.name);
  await page
    .getByLabel("ยอดรวมที่วางแผน", { exact: true })
    .fill("100");
  await page
    .getByLabel("วันเริ่มต้น", { exact: true })
    .fill(options.startDate);
  await page
    .getByLabel("วันสิ้นสุด", { exact: true })
    .fill(options.startDate);

  const walletOptions = page.getByTestId("spending-plan-wallet-options");
  await expect(walletOptions).toBeVisible();
  await walletOptions
    .getByTestId("spending-plan-wallet-checkbox")
    .first()
    .check();

  await page
    .getByTestId("spending-plan-purpose-name")
    .first()
    .fill("E2E ค่าอาหาร");
  const categoryOptions = page
    .getByTestId("spending-plan-category-options")
    .first();
  await expect(categoryOptions).toBeVisible();
  await categoryOptions
    .getByTestId("spending-plan-category-checkbox")
    .first()
    .check();
  await page.getByTestId("spending-plan-allocation").first().fill("100");

  await page.getByRole("button", { name: "สร้างแผน", exact: true }).click();
  await expect(page).toHaveURL(/\/spending-plans\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: options.name, exact: true }),
  ).toBeVisible();
}

export async function openPlans(page: Page) {
  await page.goto("/spending-plans");
  await expect(
    page.getByRole("heading", { name: "แผนการใช้เงิน", exact: true }),
  ).toBeVisible();
}
