import { expect, type Page } from "@playwright/test";
import { dateFieldValue } from "../date-format.helpers";

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

export function getPlanTestStartDate(baseOffset: number, retry: number) {
  return addDays(getBangkokToday(), baseOffset + retry * 40);
}

export function createPlanName(suffix: string) {
  return `E2E Spending Plan ${suffix} ${Date.now()}`;
}

export type DistributionFixture =
  | { type: "equal_daily" }
  | { type: "weekdays" }
  | { type: "weekly"; weekdays: number[] }
  | { type: "biweekly"; weekdays: number[] }
  | { type: "specific_dates"; dates: string[] };

export async function createPlanThroughUi(
  page: Page,
  options: {
    name: string;
    startDate: string;
    endDate?: string;
    targetAmount?: string;
    distribution?: DistributionFixture;
  },
) {
  const endDate = options.endDate ?? options.startDate;
  const distribution = options.distribution ?? { type: "equal_daily" as const };
  await page.goto("/spending-plans/new");
  await expect(
    page.getByRole("heading", { name: "สร้างแผนใหม่", exact: true }),
  ).toBeVisible();

  await page.getByLabel("ชื่อแผน", { exact: true }).fill(options.name);
  await page
    .getByLabel("วันเริ่มต้น", { exact: true })
    .fill(dateFieldValue(options.startDate));
  await page
    .getByLabel("วันสิ้นสุด", { exact: true })
    .fill(dateFieldValue(endDate));

  const walletOptions = page.getByTestId("spending-plan-wallet-options");
  await expect(walletOptions).toBeVisible();
  await walletOptions
    .getByTestId("spending-plan-wallet-checkbox")
    .first()
    .check();

  const purpose = page.getByTestId("spending-plan-purpose-card").first();
  await purpose.getByTestId("spending-plan-purpose-name").fill("E2E ค่าอาหาร");
  await purpose
    .getByTestId("spending-plan-purpose-amount")
    .fill(options.targetAmount ?? "100");
  const categoryOptions = purpose.getByTestId("spending-plan-category-options");
  await expect(categoryOptions).toBeVisible();
  await categoryOptions
    .getByTestId("spending-plan-category-checkbox")
    .first()
    .check();

  await purpose
    .getByTestId("spending-plan-distribution-select")
    .selectOption(distribution.type);

  if (distribution.type === "weekly" || distribution.type === "biweekly") {
    for (const weekday of distribution.weekdays) {
      await purpose
        .getByTestId("spending-plan-weekday-checkbox")
        .nth(weekday - 1)
        .check();
    }
  }

  if (distribution.type === "specific_dates") {
    for (const selectedDate of distribution.dates) {
      await purpose
        .getByTestId("spending-plan-specific-date-picker")
        .locator(`[data-date="${selectedDate}"]`)
        .click();
    }
  }

  const createRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/spending-plan") && request.method() === "POST",
  );
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/spending-plan") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "สร้างแผน", exact: true }).click();
  const [createRequest, createResponse] = await Promise.all([
    createRequestPromise,
    createResponsePromise,
  ]);
  const payload = JSON.parse(createRequest.postData() ?? "{}");
  expect(payload).not.toHaveProperty("amount");
  expect(payload.purposes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        target_amount: Number(options.targetAmount ?? "100"),
        distribution: expect.any(Object),
      }),
    ]),
  );
  expect(payload.purposes[0]).not.toHaveProperty("allocations");
  if (!createResponse.ok()) {
    throw new Error(
      `Create spending plan failed (${createResponse.status()}): ${await createResponse.text()}`,
    );
  }
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
