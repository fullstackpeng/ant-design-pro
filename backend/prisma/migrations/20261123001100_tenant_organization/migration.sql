BEGIN;

-- AlterTable
ALTER TABLE "app_tenant_memberships" ADD COLUMN     "department_id" BIGINT;

-- CreateTable
CREATE TABLE "app_tenant_departments" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "parent_id" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_tenant_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_tenant_positions" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_tenant_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_member_positions" (
    "tenant_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "position_id" BIGINT NOT NULL,

    CONSTRAINT "app_member_positions_pkey" PRIMARY KEY ("tenant_id","user_id","position_id")
);

-- CreateIndex
CREATE INDEX "app_tenant_departments_tenant_id_parent_id_idx" ON "app_tenant_departments"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_tenant_departments_tenant_id_code_key" ON "app_tenant_departments"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "app_tenant_departments_tenant_id_id_key" ON "app_tenant_departments"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "app_tenant_positions_tenant_id_code_key" ON "app_tenant_positions"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "app_tenant_positions_tenant_id_id_key" ON "app_tenant_positions"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "app_member_positions_tenant_id_position_id_idx" ON "app_member_positions"("tenant_id", "position_id");

-- CreateIndex
CREATE INDEX "app_tenant_memberships_tenant_id_department_id_idx" ON "app_tenant_memberships"("tenant_id", "department_id");

-- AddForeignKey
ALTER TABLE "app_tenant_memberships" ADD CONSTRAINT "app_tenant_memberships_tenant_id_department_id_fkey" FOREIGN KEY ("tenant_id", "department_id") REFERENCES "app_tenant_departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_tenant_departments" ADD CONSTRAINT "app_tenant_departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_tenant_departments" ADD CONSTRAINT "app_tenant_departments_tenant_id_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "app_tenant_departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_tenant_positions" ADD CONSTRAINT "app_tenant_positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_member_positions" ADD CONSTRAINT "app_member_positions_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "app_tenant_memberships"("tenant_id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_member_positions" ADD CONSTRAINT "app_member_positions_tenant_id_position_id_fkey" FOREIGN KEY ("tenant_id", "position_id") REFERENCES "app_tenant_positions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

INSERT INTO app_menus (code, parent_code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code) VALUES
('tenant-departments', NULL, 'page', '/tenant/departments', '部门管理', 'menu.tenant-departments', 'team', 72, 'tenant', 'admin', 'members'),
('tenant-positions', NULL, 'page', '/tenant/positions', '岗位管理', 'menu.tenant-positions', 'idcard', 73, 'tenant', 'admin', 'members');

COMMIT;
