-- Distribution metadata is nullable so existing plans remain readable as legacy plans.
CREATE TYPE "spending_plan_distribution_type" AS ENUM (
  'equal_daily',
  'weekdays',
  'weekly',
  'biweekly',
  'specific_dates'
);

ALTER TABLE "spending_plan_revision_purposes"
ADD COLUMN "distribution_type" "spending_plan_distribution_type",
ADD COLUMN "distribution_weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

CREATE TABLE "spending_plan_revision_purpose_dates" (
  "purpose_id" UUID NOT NULL,
  "selected_date" DATE NOT NULL,

  CONSTRAINT "spending_plan_revision_purpose_dates_pkey"
    PRIMARY KEY ("purpose_id", "selected_date")
);

CREATE INDEX "idx_spending_plan_purpose_dates_date"
ON "spending_plan_revision_purpose_dates"("selected_date");

ALTER TABLE "spending_plan_revision_purpose_dates"
ADD CONSTRAINT "spending_plan_revision_purpose_dates_purpose_id_fkey"
FOREIGN KEY ("purpose_id") REFERENCES "spending_plan_revision_purposes"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
