BEGIN;
CREATE TABLE "app_features" (
  "code" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL
);
CREATE TABLE "app_tenant_features" (
  "tenant_id" BIGINT NOT NULL REFERENCES "app_tenants"("id") ON DELETE CASCADE,
  "feature_code" VARCHAR(64) NOT NULL REFERENCES "app_features"("code") ON DELETE RESTRICT,
  PRIMARY KEY ("tenant_id", "feature_code")
);
CREATE TABLE "app_menus" (
  "code" VARCHAR(64) PRIMARY KEY,
  "parent_code" VARCHAR(64) REFERENCES "app_menus"("code") ON DELETE RESTRICT,
  "path" VARCHAR(200) NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "icon" VARCHAR(64) NOT NULL DEFAULT '',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "scope" VARCHAR(20) NOT NULL CHECK ("scope" IN ('authenticated', 'platform', 'tenant')),
  "min_role" VARCHAR(20) NOT NULL DEFAULT 'user' CHECK ("min_role" IN ('admin', 'user')),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "feature_code" VARCHAR(64) REFERENCES "app_features"("code") ON DELETE RESTRICT,
  CHECK (("scope" = 'tenant' AND "feature_code" IS NOT NULL) OR ("scope" <> 'tenant' AND "feature_code" IS NULL))
);
CREATE INDEX "app_menus_parent_code_idx" ON "app_menus"("parent_code");

INSERT INTO "app_features" ("code", "name") VALUES
('admin-demo', '管理示例'),
('dashboard', '仪表盘'),
('form', '表单示例'),
('list', '列表示例'),
('profile', '详情示例'),
('result', '结果示例'),
('chatbot', 'AI 助手'),
('members', '成员管理');

INSERT INTO "app_menus" ("code", "parent_code", "path", "name", "icon", "sort_order", "scope", "min_role", "feature_code") VALUES
('welcome', NULL, '/welcome', '欢迎', 'home', 0, 'authenticated', 'user', NULL),
('admin', NULL, '/admin', '管理页', 'crown', 10, 'tenant', 'admin', 'admin-demo'),
('admin-sub-page', 'admin', '/admin/sub-page', '二级管理页', '', 20, 'tenant', 'admin', 'admin-demo'),
('platform', NULL, '/platform', '平台管理', 'setting', 30, 'platform', 'user', NULL),
('platform-tenants', 'platform', '/platform/tenants', '租户管理', '', 40, 'platform', 'user', NULL),
('platform-plans', 'platform', '/platform/plans', '套餐管理', '', 50, 'platform', 'user', NULL),
('tenant-members', NULL, '/tenant/members', '租户成员', 'team', 60, 'tenant', 'admin', 'members'),
('dashboard', NULL, '/dashboard', 'Dashboard', 'dashboard', 70, 'tenant', 'user', 'dashboard'),
('dashboard-analysis', 'dashboard', '/dashboard/analysis', '分析页', 'barChart', 80, 'tenant', 'user', 'dashboard'),
('dashboard-monitor', 'dashboard', '/dashboard/monitor', '监控页', 'monitor', 90, 'tenant', 'user', 'dashboard'),
('dashboard-workplace', 'dashboard', '/dashboard/workplace', '工作台', 'desktop', 100, 'tenant', 'user', 'dashboard'),
('form', NULL, '/form', '表单页', 'form', 110, 'tenant', 'user', 'form'),
('form-basic-form', 'form', '/form/basic-form', '基础表单', 'form', 120, 'tenant', 'user', 'form'),
('form-step-form', 'form', '/form/step-form', '分步表单', 'orderedList', 130, 'tenant', 'user', 'form'),
('form-advanced-form', 'form', '/form/advanced-form', '高级表单', 'profile', 140, 'tenant', 'user', 'form'),
('list', NULL, '/list', '列表页', 'table', 150, 'tenant', 'user', 'list'),
('list-search-list', 'list', '/list/search', '搜索列表', '', 160, 'tenant', 'user', 'list'),
('list-search-list-articles', 'list-search-list', '/list/search/articles', '搜索列表（文章）', 'read', 170, 'tenant', 'user', 'list'),
('list-search-list-projects', 'list-search-list', '/list/search/projects', '搜索列表（项目）', 'project', 180, 'tenant', 'user', 'list'),
('list-search-list-applications', 'list-search-list', '/list/search/applications', '搜索列表（应用）', 'appstore', 190, 'tenant', 'user', 'list'),
('list-table-list', 'list', '/list/table-list', '查询表格', 'table', 200, 'tenant', 'user', 'list'),
('list-basic-list', 'list', '/list/basic-list', '标准列表', 'unorderedList', 210, 'tenant', 'user', 'list'),
('list-card-list', 'list', '/list/card-list', '卡片列表', 'creditCard', 220, 'tenant', 'user', 'list'),
('profile', NULL, '/profile', '详情页', 'profile', 230, 'tenant', 'user', 'profile'),
('profile-basic', 'profile', '/profile/basic', '基础详情页', 'idcard', 240, 'tenant', 'user', 'profile'),
('profile-advanced', 'profile', '/profile/advanced', '高级详情页', 'crown', 250, 'tenant', 'user', 'profile'),
('result', NULL, '/result', '结果页', 'checkCircle', 260, 'tenant', 'user', 'result'),
('result-success', 'result', '/result/success', '成功页', 'checkCircle', 270, 'tenant', 'user', 'result'),
('result-fail', 'result', '/result/fail', '失败页', 'closeCircle', 280, 'tenant', 'user', 'result'),
('account', NULL, '/account', '个人页', 'user', 290, 'authenticated', 'user', NULL),
('account-center', 'account', '/account/center', '个人中心', 'user', 300, 'authenticated', 'user', NULL),
('account-settings', 'account', '/account/settings', '个人设置', 'setting', 310, 'authenticated', 'user', NULL),
('chatbot', NULL, '/chatbot', 'AI 助手', 'robot', 320, 'tenant', 'user', 'chatbot'),
('platform-navigation', 'platform', '/platform/navigation', '菜单管理', 'menu', 75, 'platform', 'user', NULL);

-- Preserve access for existing tenants. New tenants require explicit assignment.
INSERT INTO "app_tenant_features" ("tenant_id", "feature_code")
SELECT t."id", f."code" FROM "app_tenants" t CROSS JOIN "app_features" f;
COMMIT;
