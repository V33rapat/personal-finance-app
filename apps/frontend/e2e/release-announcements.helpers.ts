import { expect, type Locator, type Page } from "@playwright/test";

export const RELEASE_ANNOUNCEMENT_EMAILS = {
  fresh: "playwright-announcement-default@walpaca.test",
  missed: "playwright-announcement-missed@walpaca.test",
  dismissal: "playwright-announcement-dismissal@walpaca.test",
  history: "playwright-announcement-history@walpaca.test",
  safety: "playwright-announcement-safety@walpaca.test",
  mobile: "playwright-announcement-mobile@walpaca.test",
};

export const RELEASE_ANNOUNCEMENT_PASSWORD = "PlaywrightE2E!123";

export async function loginToAnnouncementAccount(
  page: Page,
  email: string,
  options: { waitForPopupResponse?: boolean } = {},
) {
  await page.goto("/login");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("อีเมล").fill(email);
  await page
    .getByRole("textbox", { name: "รหัสผ่าน", exact: true })
    .fill(RELEASE_ANNOUNCEMENT_PASSWORD);

  const popupRequest = options.waitForPopupResponse === false
    ? null
    : page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/release-announcement/popup";
      });
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  if (popupRequest) await popupRequest;
}

export async function authenticateAndOpenPage(
  page: Page,
  email: string,
  path: string,
) {
  await page.goto("/login");
  const response = await page.request.post("/api/auth/login", {
    data: { email, password: RELEASE_ANNOUNCEMENT_PASSWORD },
  });
  if (!response.ok()) throw new Error(`Login failed with ${response.status()}`);
  await page.goto(path);
}

export async function getAnnouncementDialog(page: Page): Promise<Locator> {
  const dialog = page.getByRole("dialog", { name: "อัปเดตใหม่จาก Walpaca" });
  await expect(dialog).toBeVisible({ timeout: 8_000 });
  return dialog;
}

export function getReleaseCard(dialog: Locator, releaseId: string) {
  return dialog.getByTestId(`release-announcement-${releaseId}`);
}

export function getReleaseCards(dialog: Locator) {
  return dialog.locator('article[data-testid^="release-announcement-"]');
}

export async function getSameOriginJson(page: Page, path: string) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return {
      status: response.status,
      body: await response.json() as unknown,
    };
  }, path);
}

export async function waitForAnnouncementStateRequest(
  page: Page,
  action: "seen" | "dismiss",
) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname === `/api/release-announcement/${action}` &&
      request.method() === "POST"
    );
  });
}
