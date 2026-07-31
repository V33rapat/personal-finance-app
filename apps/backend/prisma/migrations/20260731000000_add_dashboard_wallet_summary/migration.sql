-- CreateTable
CREATE TABLE "dashboard_wallet_summary_preferences" (
    "user_id" UUID NOT NULL,
    "is_configured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_wallet_summary_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "dashboard_wallet_summary_wallets" (
    "user_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_wallet_summary_wallets_pkey" PRIMARY KEY ("user_id", "wallet_id")
);

-- CreateIndex
CREATE INDEX "idx_dashboard_wallet_summary_wallets_wallet_id" ON "dashboard_wallet_summary_wallets"("wallet_id");

-- AddForeignKey
ALTER TABLE "dashboard_wallet_summary_preferences" ADD CONSTRAINT "dashboard_wallet_summary_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dashboard_wallet_summary_wallets" ADD CONSTRAINT "dashboard_wallet_summary_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "dashboard_wallet_summary_preferences"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dashboard_wallet_summary_wallets" ADD CONSTRAINT "dashboard_wallet_summary_wallets_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
