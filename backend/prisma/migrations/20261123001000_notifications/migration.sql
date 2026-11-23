BEGIN;

CREATE TABLE "app_notifications" (
    "id" BIGSERIAL NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "tenant_id" BIGINT,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content_html" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "publish_at" TIMESTAMPTZ(6),
    "expire_at" TIMESTAMPTZ(6),
    "creator_id" BIGINT NOT NULL,
    "creator_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_notifications_source_check" CHECK ("source" IN ('platform', 'tenant')),
    CONSTRAINT "app_notifications_type_check" CHECK ("type" IN ('notice', 'announcement')),
    CONSTRAINT "app_notifications_tenant_check" CHECK (
        ("source" = 'platform' AND "tenant_id" IS NULL) OR
        ("source" = 'tenant' AND "tenant_id" IS NOT NULL)
    ),
    CONSTRAINT "app_notifications_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "app_notifications_source_tenant_created_idx" ON "app_notifications"("source", "tenant_id", "created_at");
CREATE INDEX "app_notifications_tenant_type_created_idx" ON "app_notifications"("tenant_id", "type", "created_at");

CREATE TABLE "app_notification_target_tenants" (
    "notification_id" BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    CONSTRAINT "app_notification_target_tenants_pkey" PRIMARY KEY ("notification_id", "tenant_id"),
    CONSTRAINT "app_notification_target_tenants_notification_fkey" FOREIGN KEY ("notification_id") REFERENCES "app_notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "app_notification_target_tenants_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "app_notification_target_tenants_tenant_idx" ON "app_notification_target_tenants"("tenant_id");

CREATE TABLE "app_notification_target_members" (
    "notification_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    CONSTRAINT "app_notification_target_members_pkey" PRIMARY KEY ("notification_id", "user_id"),
    CONSTRAINT "app_notification_target_members_notification_fkey" FOREIGN KEY ("notification_id") REFERENCES "app_notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "app_notification_target_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "app_notification_target_members_user_idx" ON "app_notification_target_members"("user_id");

CREATE TABLE "app_notification_reads" (
    "notification_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_notification_reads_pkey" PRIMARY KEY ("notification_id", "user_id"),
    CONSTRAINT "app_notification_reads_notification_fkey" FOREIGN KEY ("notification_id") REFERENCES "app_notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "app_notification_reads_user_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "app_notification_reads_user_read_idx" ON "app_notification_reads"("user_id", "read_at");

INSERT INTO "app_features" ("code", "name", "description", "category", "sort_order", "is_demo", "default_granted") VALUES
('notifications', '消息中心', '通知公告的发布与阅读', 'base', 50, false, true);

INSERT INTO "app_menus" ("code", "parent_code", "kind", "path", "name", "i18n_key", "icon", "sort_order", "scope", "min_role", "feature_code") VALUES
('platform-notifications', 'platform-content', 'page', '/platform/notifications', '通知公告', 'menu.platform.notifications', 'notification', 80, 'platform', 'user', NULL),
('message-center', NULL, 'directory', NULL, '消息中心', 'menu.message-center', 'mail', 50, 'tenant', 'user', NULL),
('tenant-notifications', 'message-center', 'page', '/message-center/notifications', '通知公告管理', 'menu.tenant.notifications', 'notification', 10, 'tenant', 'admin', 'notifications'),
('notifications-inbox', 'message-center', 'page', '/message-center/inbox', '我的消息', 'menu.message-center.inbox', 'inbox', 20, 'tenant', 'user', 'notifications');

INSERT INTO "app_tenant_features" ("tenant_id", "feature_code")
SELECT "id", 'notifications' FROM "app_tenants"
ON CONFLICT DO NOTHING;

COMMIT;
