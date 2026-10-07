# Release Announcement Authoring

Release announcements are stored in `apps/backend/src/release-announcement/data/releases.json` and shipped with the Backend. The production catalog is currently empty; add an entry only when its changes are ready for users.

## Before Publishing

- Confirm the announced functionality is deployed and usable in the Product, including any required Frontend and Backend changes.
- Add one entry for an intentional user-facing release, not for every deployment.
- Set a new stable `id`, user-facing `version`, unique increasing integer `release_order`, and UTC `published_at` timestamp.
- Include a clear `title`, concise `summary`, and at least one update across `features`, `improvements`, or `fixes`.
- Use `href` only for an approved in-app route: `/allocation`, `/dashboard`, `/profile`, `/spending-plans`, `/transaction-templates`, `/transactions`, `/transfer`, `/wallet`, or `/whats-new`.

## Preserve Release Identity

Once an announcement is published, keep its `id`, `version`, `release_order`, and `published_at` unchanged. Correct wording in place with the same ID so a user's seen or dismissed state remains attached to that release. For a genuinely new update, append a new entry with a new ID and order. Do not remove an old entry or reuse its ID; old entries provide the user's history and may have persisted state in the database.

## Verify

After editing the catalog, run the Backend lint, build, and unit tests. The catalog validator checks required fields, unique identity values, release ordering, update content, dates, and allowed internal links. Run the Playwright suite when the user-facing release flow or its destinations change.

The catalog is data, not HTML. Keep update text plain and do not add external links, markup, images, or executable content.
