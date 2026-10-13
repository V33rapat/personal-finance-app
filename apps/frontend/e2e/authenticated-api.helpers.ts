import type { Page } from "@playwright/test";

export async function authenticatedApiRequest(
  page: Page,
  path: string,
  options: { method?: string; data?: unknown } = {},
) {
  if (!path.startsWith("/api/")) {
    throw new Error("Authenticated test requests must target an app API route");
  }

  // APIRequestContext does not automatically send Secure cookies over local HTTP.
  const cookies = await page.context().cookies();
  return page.request.fetch(path, {
    ...options,
    headers: { Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") },
  });
}
