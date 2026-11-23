CREATE TABLE "app_account_avatars" (
  "user_id" BIGINT NOT NULL,
  "version" UUID NOT NULL,
  "provider_id" BIGINT NOT NULL,
  "object_key" VARCHAR(512) NOT NULL,
  CONSTRAINT "app_account_avatars_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "app_account_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "app_account_avatars_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "app_storage_providers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "app_account_avatars_version_key" ON "app_account_avatars"("version");
CREATE INDEX "app_account_avatars_provider_id_idx" ON "app_account_avatars"("provider_id");
