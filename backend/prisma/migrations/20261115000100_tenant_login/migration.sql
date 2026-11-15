BEGIN;

CREATE TABLE "app_tenants" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "app_tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "app_tenants_code_key" ON "app_tenants"("code");

CREATE TABLE "app_tenant_memberships" (
    "tenant_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "app_tenant_memberships_pkey" PRIMARY KEY ("tenant_id", "user_id"),
    CONSTRAINT "app_tenant_memberships_role_check" CHECK ("role" IN ('admin', 'user'))
);
CREATE INDEX "app_tenant_memberships_user_id_idx" ON "app_tenant_memberships"("user_id");

-- Existing users retain their roles within the default tenant.
INSERT INTO "app_tenants" ("code", "name") VALUES ('tenant-a', '示例企业 A');
INSERT INTO "app_tenant_memberships" ("tenant_id", "user_id", "role")
SELECT t."id", u."id", u."access"
FROM "app_users" u CROSS JOIN "app_tenants" t WHERE t."code" = 'tenant-a';

-- Backfill sessions before enforcing tenant membership at the database layer.
ALTER TABLE "app_sessions" ADD COLUMN "tenant_id" BIGINT;
UPDATE "app_sessions" SET "tenant_id" = (SELECT "id" FROM "app_tenants" WHERE "code" = 'tenant-a');
ALTER TABLE "app_sessions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "app_sessions" DROP CONSTRAINT "app_sessions_user_id_fkey";
ALTER TABLE "app_users" DROP COLUMN "access";
CREATE INDEX "app_sessions_tenant_id_user_id_idx" ON "app_sessions"("tenant_id", "user_id");

ALTER TABLE "app_tenant_memberships" ADD CONSTRAINT "app_tenant_memberships_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "app_tenant_memberships" ADD CONSTRAINT "app_tenant_memberships_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_tenant_id_user_id_fkey"
FOREIGN KEY ("tenant_id", "user_id") REFERENCES "app_tenant_memberships"("tenant_id", "user_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT;
