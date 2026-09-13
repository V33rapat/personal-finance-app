-- CreateIndex
CREATE INDEX "idx_transactions_wallet_date" ON "transactions"("wallet_id", "transaction_date" DESC);
