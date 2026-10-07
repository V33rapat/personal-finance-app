import { expect, test } from "@playwright/test";
import {
  getAnnouncementDialog,
  getReleaseCard,
  getReleaseCards,
  getSameOriginJson,
  loginToAnnouncementAccount,
  RELEASE_ANNOUNCEMENT_EMAILS,
} from "./release-announcements.helpers";

test("new users start at the latest published release", async ({ page }) => {
  const seenRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/release-announcement/seen",
  );
  await loginToAnnouncementAccount(page, RELEASE_ANNOUNCEMENT_EMAILS.fresh);
  const dialog = await getAnnouncementDialog(page);

  await expect(getReleaseCards(dialog)).toHaveCount(1);
  await expect(getReleaseCard(dialog, "walpaca-1.2.0")).toBeVisible();
  await expect(getReleaseCard(dialog, "walpaca-1.1.0")).toHaveCount(0);
  await expect(getReleaseCard(dialog, "walpaca-1.0.0")).toHaveCount(0);
  await expect(
    getReleaseCard(dialog, "walpaca-1.2.0").getByRole("button"),
  ).toHaveAttribute("aria-expanded", "true");
  expect((await seenRequest).postDataJSON()).toEqual({
    release_ids: ["walpaca-1.2.0"],
  });

  const historyResponse = await getSameOriginJson(
    page,
    "/api/release-announcement/history",
  );
  expect(historyResponse.status).toBe(200);
  const history = historyResponse.body as {
    baseline_release_order: number;
    announcements: Array<{ id: string; display_state: string }>;
  };
  expect(history.baseline_release_order).toBe(3);
  expect(history.announcements.map(({ id }) => id)).toEqual([
    "walpaca-1.2.0",
    "walpaca-1.1.0",
    "walpaca-1.0.0",
  ]);
  expect(history.announcements[0].display_state).toBe("seen");
});
