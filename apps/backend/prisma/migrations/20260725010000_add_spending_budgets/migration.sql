CREATE TYPE "public"."spending_budget_period" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

CREATE TABLE "public"."spending_budgets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "period" "public"."spending_budget_period" NOT NULL,
    "includes_uncategorized" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."spending_budget_categories" (
    "budget_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_budget_categories_pkey" PRIMARY KEY ("budget_id", "category_id")
);

CREATE INDEX "idx_spending_budgets_user_active_period"
ON "public"."spending_budgets"("user_id", "is_active", "period");

CREATE INDEX "idx_spending_budget_categories_category_id"
ON "public"."spending_budget_categories"("category_id");

ALTER TABLE "public"."spending_budgets"
ADD CONSTRAINT "spending_budgets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."spending_budget_categories"
ADD CONSTRAINT "spending_budget_categories_budget_id_fkey"
FOREIGN KEY ("budget_id") REFERENCES "public"."spending_budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."spending_budget_categories"
ADD CONSTRAINT "spending_budget_categories_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
