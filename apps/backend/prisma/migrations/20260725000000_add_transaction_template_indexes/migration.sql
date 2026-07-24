CREATE UNIQUE INDEX IF NOT EXISTS "uq_transaction_templates_user_name_type"
ON "transaction_templates"("user_id", "name", "type");

CREATE INDEX IF NOT EXISTS "idx_transaction_templates_user_active_type"
ON "transaction_templates"("user_id", "is_active", "type");
