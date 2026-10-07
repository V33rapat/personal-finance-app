CREATE TABLE "release_announcement_preferences" (
    "user_id" UUID NOT NULL,
    "baseline_release_id" VARCHAR(100) NOT NULL,
    "baseline_release_order" INTEGER NOT NULL,
    "initialized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_announcement_preferences_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "release_announcement_user_states" (
    "user_id" UUID NOT NULL,
    "release_id" VARCHAR(100) NOT NULL,
    "seen_at" TIMESTAMPTZ(6),
    "dismissed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_announcement_user_states_pkey" PRIMARY KEY ("user_id", "release_id")
);

CREATE INDEX "idx_release_announcement_states_user_dismissed"
    ON "release_announcement_user_states"("user_id", "dismissed_at");

ALTER TABLE "release_announcement_preferences"
    ADD CONSTRAINT "release_announcement_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "release_announcement_user_states"
    ADD CONSTRAINT "release_announcement_user_states_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
