BEGIN;
CREATE TABLE "app_operation_logs" (
  "id" BIGSERIAL NOT NULL PRIMARY KEY,
  "event_id" UUID NOT NULL UNIQUE,
  "event_code" VARCHAR(120) NOT NULL,
  "module" VARCHAR(64) NOT NULL,
  "action" VARCHAR(150) NOT NULL,
  "scope" VARCHAR(20) NOT NULL,
  "tenant_id" BIGINT,
  "tenant_code" VARCHAR(64) NOT NULL DEFAULT '',
  "tenant_name" VARCHAR(100) NOT NULL DEFAULT '',
  "actor_id" BIGINT,
  "actor_name" VARCHAR(100) NOT NULL DEFAULT '',
  "target_tenant_id" BIGINT,
  "target_type" VARCHAR(100) NOT NULL DEFAULT '',
  "target_id" VARCHAR(100) NOT NULL DEFAULT '',
  "target_name" VARCHAR(200) NOT NULL DEFAULT '',
  "result" VARCHAR(20) NOT NULL,
  "message" VARCHAR(500) NOT NULL DEFAULT '',
  "request_id" VARCHAR(100) NOT NULL,
  "ip" VARCHAR(64) NOT NULL DEFAULT '',
  "user_agent" VARCHAR(500) NOT NULL DEFAULT '',
  "changes" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "app_operation_logs_scope_time_idx" ON "app_operation_logs" ("scope", "tenant_id", "created_at", "id");
CREATE INDEX "app_operation_logs_time_idx" ON "app_operation_logs" ("created_at", "id");
CREATE INDEX "app_operation_logs_request_idx" ON "app_operation_logs" ("request_id");
CREATE TABLE "app_login_logs" (
  "id" BIGSERIAL NOT NULL PRIMARY KEY,
  "event_id" UUID NOT NULL UNIQUE,
  "event_code" VARCHAR(120) NOT NULL,
  "module" VARCHAR(64) NOT NULL,
  "action" VARCHAR(150) NOT NULL,
  "scope" VARCHAR(20) NOT NULL,
  "tenant_id" BIGINT,
  "tenant_code" VARCHAR(64) NOT NULL DEFAULT '',
  "tenant_name" VARCHAR(100) NOT NULL DEFAULT '',
  "actor_id" BIGINT,
  "actor_name" VARCHAR(100) NOT NULL DEFAULT '',
  "target_tenant_id" BIGINT,
  "target_type" VARCHAR(100) NOT NULL DEFAULT '',
  "target_id" VARCHAR(100) NOT NULL DEFAULT '',
  "target_name" VARCHAR(200) NOT NULL DEFAULT '',
  "result" VARCHAR(20) NOT NULL,
  "message" VARCHAR(500) NOT NULL DEFAULT '',
  "request_id" VARCHAR(100) NOT NULL,
  "ip" VARCHAR(64) NOT NULL DEFAULT '',
  "user_agent" VARCHAR(500) NOT NULL DEFAULT '',
  "changes" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempted_account" VARCHAR(64) NOT NULL DEFAULT '',
  "attempted_tenant" VARCHAR(64) NOT NULL DEFAULT ''
);
CREATE INDEX "app_login_logs_scope_time_idx" ON "app_login_logs" ("scope", "tenant_id", "created_at", "id");
CREATE INDEX "app_login_logs_time_idx" ON "app_login_logs" ("created_at", "id");
CREATE INDEX "app_login_logs_request_idx" ON "app_login_logs" ("request_id");
CREATE TABLE "app_audit_policy" ("id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1), "operation_days" INTEGER NOT NULL DEFAULT 180 CHECK ("operation_days" BETWEEN 1 AND 3650), "login_days" INTEGER NOT NULL DEFAULT 180 CHECK ("login_days" BETWEEN 1 AND 3650), "revision" INTEGER NOT NULL DEFAULT 0);
INSERT INTO "app_audit_policy" ("id") VALUES (1);
INSERT INTO "app_features" ("code","name","description","category","sort_order","is_demo","default_granted") VALUES ('audit','审计日志','操作日志与登录日志','base',60,false,true);
INSERT INTO "app_tenant_features" ("tenant_id","feature_code") SELECT "id",'audit' FROM "app_tenants" ON CONFLICT DO NOTHING;
INSERT INTO "app_menus" ("code","parent_code","kind","path","name","icon","sort_order","scope","min_role","feature_code") VALUES ('platform-audit',NULL,'directory',NULL,'审计日志','profile',90,'platform','user',NULL);
INSERT INTO "app_menus" ("code","parent_code","kind","path","name","icon","sort_order","scope","min_role","feature_code") VALUES ('platform-audit-operation','platform-audit','page','/platform/audit/operation-logs','操作日志','profile',10,'platform','user',NULL);
INSERT INTO "app_menus" ("code","parent_code","kind","path","name","icon","sort_order","scope","min_role","feature_code") VALUES ('platform-audit-login','platform-audit','page','/platform/audit/login-logs','登录日志','profile',20,'platform','user',NULL);
INSERT INTO "app_menus" ("code","parent_code","kind","path","name","icon","sort_order","scope","min_role","feature_code") VALUES ('tenant-audit',NULL,'directory',NULL,'审计日志','profile',90,'tenant','user',NULL);
INSERT INTO "app_menus" ("code","parent_code","kind","path","name","icon","sort_order","scope","min_role","feature_code") VALUES ('tenant-audit-operation','tenant-audit','page','/tenant/audit/operation-logs','操作日志','profile',10,'tenant','user','audit');
INSERT INTO "app_menus" ("code","parent_code","kind","path","name","icon","sort_order","scope","min_role","feature_code") VALUES ('tenant-audit-login','tenant-audit','page','/tenant/audit/login-logs','登录日志','profile',20,'tenant','user','audit');
COMMIT;
