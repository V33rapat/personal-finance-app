CREATE TABLE "dashboard_preferences" (
    "user_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "is_category_breakdown_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_preferences_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "dashboard_preferences_period_order_check" CHECK ("period_start" <= "period_end")
);

CREATE TABLE "dashboard_hidden_categories" (
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_hidden_categories_pkey" PRIMARY KEY ("user_id", "category_id")
);

CREATE INDEX "idx_dashboard_hidden_categories_category_id"
ON "dashboard_hidden_categories"("category_id");

ALTER TABLE "dashboard_preferences"
ADD CONSTRAINT "dashboard_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "dashboard_hidden_categories"
ADD CONSTRAINT "dashboard_hidden_categories_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "dashboard_preferences"("user_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "dashboard_hidden_categories"
ADD CONSTRAINT "dashboard_hidden_categories_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
