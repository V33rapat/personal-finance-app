CREATE TABLE "money_allocations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "source_wallet_id" UUID NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "allocation_date" DATE NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "money_allocations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transfers" ADD COLUMN "allocation_id" UUID;

CREATE INDEX "idx_money_allocations_user_date"
    ON "money_allocations"("user_id", "deleted_at", "allocation_date" DESC);
CREATE INDEX "idx_money_allocations_source_wallet"
    ON "money_allocations"("source_wallet_id");
CREATE INDEX "idx_transfers_allocation" ON "transfers"("allocation_id");

ALTER TABLE "money_allocations"
    ADD CONSTRAINT "money_allocations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "money_allocations"
    ADD CONSTRAINT "money_allocations_source_wallet_id_fkey"
    FOREIGN KEY ("source_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "transfers"
    ADD CONSTRAINT "transfers_allocation_id_fkey"
    FOREIGN KEY ("allocation_id") REFERENCES "money_allocations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
