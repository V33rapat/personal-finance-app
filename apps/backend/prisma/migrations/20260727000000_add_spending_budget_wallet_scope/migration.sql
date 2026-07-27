CREATE TYPE "public"."spending_budget_wallet_scope" AS ENUM ('all', 'selected');

ALTER TABLE "public"."spending_budgets"
ADD COLUMN "wallet_scope" "public"."spending_budget_wallet_scope" NOT NULL DEFAULT 'all';

CREATE TABLE "public"."spending_budget_wallets" (
    "budget_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_budget_wallets_pkey" PRIMARY KEY ("budget_id", "wallet_id")
);

CREATE INDEX "idx_spending_budget_wallets_wallet_id"
ON "public"."spending_budget_wallets"("wallet_id");

ALTER TABLE "public"."spending_budget_wallets"
ADD CONSTRAINT "spending_budget_wallets_budget_id_fkey"
FOREIGN KEY ("budget_id") REFERENCES "public"."spending_budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."spending_budget_wallets"
ADD CONSTRAINT "spending_budget_wallets_wallet_id_fkey"
FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
