BEGIN;

-- AlterTable
ALTER TABLE "app_sessions" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "app_plans" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "max_members" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_subscriptions" (
    "tenant_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_subscriptions_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_plans_code_key" ON "app_plans"("code");

-- CreateIndex
CREATE INDEX "app_subscriptions_plan_id_idx" ON "app_subscriptions"("plan_id");

-- AddForeignKey
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_subscriptions" ADD CONSTRAINT "app_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_subscriptions" ADD CONSTRAINT "app_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "app_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "app_plans" ADD CONSTRAINT "app_plans_max_members_check" CHECK ("max_members" BETWEEN 1 AND 100000);
ALTER TABLE "app_subscriptions" ADD CONSTRAINT "app_subscriptions_period_check" CHECK ("expires_at" > "starts_at");

COMMIT;

