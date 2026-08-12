-- Keep the newest revision for each effective date before enforcing one revision per day.
DELETE FROM "spending_plan_revisions" AS older
USING "spending_plan_revisions" AS newer
WHERE older."plan_id" = newer."plan_id"
  AND older."effective_date" = newer."effective_date"
  AND (
    newer."created_at" > older."created_at"
    OR (newer."created_at" = older."created_at" AND newer."id" > older."id")
  );

CREATE UNIQUE INDEX "uq_spending_plan_revisions_plan_effective_date"
ON "spending_plan_revisions"("plan_id", "effective_date");
