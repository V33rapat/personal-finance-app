-- CreateEnum
CREATE TYPE "spending_plan_view" AS ENUM ('monthly', 'range', 'daily');

-- CreateTable
CREATE TABLE "spending_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_plan_revisions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "plan_id" UUID NOT NULL,
    "effective_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_plan_revision_wallets" (
    "revision_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_plan_revision_wallets_pkey" PRIMARY KEY ("revision_id", "wallet_id")
);

-- CreateTable
CREATE TABLE "spending_plan_revision_purposes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "revision_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "spending_plan_revision_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_plan_revision_purpose_categories" (
    "purpose_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_plan_revision_purpose_categories_pkey" PRIMARY KEY ("purpose_id", "category_id")
);

-- CreateTable
CREATE TABLE "spending_plan_revision_allocations" (
    "purpose_id" UUID NOT NULL,
    "allocation_date" DATE NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_plan_revision_allocations_pkey" PRIMARY KEY ("purpose_id", "allocation_date")
);

-- CreateTable
CREATE TABLE "spending_plan_view_preferences" (
    "plan_id" UUID NOT NULL,
    "last_view" "spending_plan_view" NOT NULL DEFAULT 'monthly',
    "show_daily_balance" BOOLEAN NOT NULL DEFAULT true,
    "visible_purpose_names" VARCHAR(100)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(100)[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_plan_view_preferences_pkey" PRIMARY KEY ("plan_id")
);

-- CreateIndex
CREATE INDEX "idx_spending_plans_user_dates" ON "spending_plans"("user_id", "start_date", "end_date");
CREATE INDEX "idx_spending_plans_user_cancelled" ON "spending_plans"("user_id", "cancelled_at");
CREATE INDEX "idx_spending_plan_revisions_plan_date" ON "spending_plan_revisions"("plan_id", "effective_date" DESC, "created_at" DESC);
CREATE INDEX "idx_spending_plan_revision_wallets_wallet" ON "spending_plan_revision_wallets"("wallet_id");
CREATE UNIQUE INDEX "uq_spending_plan_revision_purpose_name" ON "spending_plan_revision_purposes"("revision_id", "name");
CREATE INDEX "idx_spending_plan_revision_purposes_order" ON "spending_plan_revision_purposes"("revision_id", "sort_order");
CREATE INDEX "idx_spending_plan_purpose_categories_category" ON "spending_plan_revision_purpose_categories"("category_id");
CREATE INDEX "idx_spending_plan_allocations_date" ON "spending_plan_revision_allocations"("allocation_date");

-- AddForeignKey
ALTER TABLE "spending_plans" ADD CONSTRAINT "spending_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revisions" ADD CONSTRAINT "spending_plan_revisions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "spending_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revision_wallets" ADD CONSTRAINT "spending_plan_revision_wallets_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "spending_plan_revisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revision_wallets" ADD CONSTRAINT "spending_plan_revision_wallets_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revision_purposes" ADD CONSTRAINT "spending_plan_revision_purposes_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "spending_plan_revisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revision_purpose_categories" ADD CONSTRAINT "spending_plan_revision_purpose_categories_purpose_id_fkey" FOREIGN KEY ("purpose_id") REFERENCES "spending_plan_revision_purposes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revision_purpose_categories" ADD CONSTRAINT "spending_plan_revision_purpose_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_revision_allocations" ADD CONSTRAINT "spending_plan_revision_allocations_purpose_id_fkey" FOREIGN KEY ("purpose_id") REFERENCES "spending_plan_revision_purposes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "spending_plan_view_preferences" ADD CONSTRAINT "spending_plan_view_preferences_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "spending_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
