-- CreateTable
CREATE TABLE "app_storage_providers" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "protocol" VARCHAR(32) NOT NULL,
    "config" JSONB NOT NULL,
    "secrets" TEXT NOT NULL,
    "secret_keys" TEXT[] NOT NULL,
    "secret_key_version" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_storage_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_files" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "provider_id" BIGINT NOT NULL,
    "protocol" VARCHAR(32) NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "size" BIGINT NOT NULL,
    "checksum" VARCHAR(128),
    "uploaded_by" BIGINT NOT NULL,
    "uploaded_by_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_files_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "app_plans" ADD COLUMN "max_storage_mb" INTEGER NOT NULL DEFAULT 5120;
ALTER TABLE "app_plans" ADD COLUMN "max_file_size_mb" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE UNIQUE INDEX "app_storage_providers_code_key" ON "app_storage_providers"("code");
CREATE INDEX "app_storage_providers_is_default_idx" ON "app_storage_providers"("is_default");
-- Only one provider may be the global default.
CREATE UNIQUE INDEX "app_storage_providers_one_default" ON "app_storage_providers"("is_default") WHERE "is_default";

-- CreateIndex
CREATE UNIQUE INDEX "app_files_provider_id_object_key_key" ON "app_files"("provider_id", "object_key");
CREATE INDEX "app_files_tenant_id_created_at_idx" ON "app_files"("tenant_id", "created_at");
CREATE INDEX "app_files_provider_id_idx" ON "app_files"("provider_id");

-- AddForeignKey
ALTER TABLE "app_files" ADD CONSTRAINT "app_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "app_files" ADD CONSTRAINT "app_files_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "app_storage_providers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- File management is enabled for existing tenants by default.
INSERT INTO app_features(code, name) VALUES ('files', '文件管理');
INSERT INTO app_tenant_features (tenant_id, feature_code)
SELECT id, 'files' FROM app_tenants;

INSERT INTO app_menus (code, parent_code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code) VALUES
('platform-storage-providers', 'platform', 'page', '/platform/storage-providers', '存储服务商', 'menu.platform.storage-providers', 'cloud', 76, 'platform', 'user', NULL),
('platform-files', 'platform', 'page', '/platform/files', '文件管理', 'menu.platform.files', 'folder', 77, 'platform', 'user', NULL),
('files', NULL, 'page', '/files', '文件管理', 'menu.files', 'folder', 66, 'tenant', 'user', 'files');
