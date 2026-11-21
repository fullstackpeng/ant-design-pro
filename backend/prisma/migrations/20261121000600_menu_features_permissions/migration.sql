-- Feature metadata used by the assignment UI and new-tenant defaults.
ALTER TABLE "app_features" ADD COLUMN "description" VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE "app_features" ADD COLUMN "category" VARCHAR(32) NOT NULL DEFAULT 'base';
ALTER TABLE "app_features" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "app_features" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "app_features" ADD COLUMN "default_granted" BOOLEAN NOT NULL DEFAULT false;

UPDATE app_features SET description = '租户成员与角色管理', category = 'base', sort_order = 10, default_granted = true WHERE code = 'members';
UPDATE app_features SET description = '租户文件上传、下载与空间配额', category = 'base', sort_order = 20, default_granted = true WHERE code = 'files';
UPDATE app_features SET description = '平台及租户自有 MQTT Broker 接入', category = 'base', sort_order = 30, default_granted = true WHERE code = 'mqtt';
UPDATE app_features SET description = '租户自定义字典与字段选项', category = 'base', sort_order = 40 WHERE code = 'dictionaries';

UPDATE app_features SET description = '示例仪表盘页面', category = 'samples', sort_order = 110, is_demo = true WHERE code = 'dashboard';
UPDATE app_features SET description = '示例管理页面', category = 'samples', sort_order = 120, is_demo = true WHERE code = 'admin-demo';
UPDATE app_features SET description = '示例表单页面', category = 'samples', sort_order = 130, is_demo = true WHERE code = 'form';
UPDATE app_features SET description = '示例列表页面', category = 'samples', sort_order = 140, is_demo = true WHERE code = 'list';
UPDATE app_features SET description = '示例详情页面', category = 'samples', sort_order = 150, is_demo = true WHERE code = 'profile';
UPDATE app_features SET description = '示例结果页面', category = 'samples', sort_order = 160, is_demo = true WHERE code = 'result';
UPDATE app_features SET description = '示例 AI 助手页面', category = 'samples', sort_order = 170, is_demo = true WHERE code = 'chatbot';

-- Platform menu directories.
INSERT INTO app_menus (code, parent_code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code) VALUES
('platform-access', 'platform', 'directory', NULL, '租户与套餐', 'menu.platform.access', 'appstore', 100, 'platform', 'user', NULL),
('platform-accounts', 'platform', 'directory', NULL, '账户', 'menu.platform.accounts', 'user', 200, 'platform', 'user', NULL),
('platform-integrations', 'platform', 'directory', NULL, '集成与资源', 'menu.platform.integrations', 'api', 300, 'platform', 'user', NULL),
('platform-operations', 'platform', 'directory', NULL, '运维', 'menu.platform.operations', 'setting', 400, 'platform', 'user', NULL),
('platform-content', 'platform', 'directory', NULL, '内容', 'menu.platform.content', 'book', 500, 'platform', 'user', NULL),
('platform-system', 'platform', 'directory', NULL, '系统', 'menu.platform.system', 'menu', 600, 'platform', 'user', NULL),
('platform-devtools', 'platform', 'directory', NULL, '开发工具', 'menu.platform.devtools', 'api', 900, 'platform', 'user', NULL);

UPDATE app_menus SET parent_code = 'platform-access', sort_order = 110 WHERE code = 'platform-tenants';
UPDATE app_menus SET parent_code = 'platform-access', sort_order = 120 WHERE code = 'platform-plans';
UPDATE app_menus SET parent_code = 'platform-accounts', sort_order = 210 WHERE code = 'platform-users';
UPDATE app_menus SET parent_code = 'platform-integrations', sort_order = 310 WHERE code = 'platform-storage-providers';
UPDATE app_menus SET parent_code = 'platform-integrations', sort_order = 320 WHERE code = 'platform-files';
UPDATE app_menus SET parent_code = 'platform-integrations', sort_order = 330 WHERE code = 'platform-mqtt';
UPDATE app_menus SET parent_code = 'platform-integrations', sort_order = 340 WHERE code = 'platform-mqtt-messages';
UPDATE app_menus SET parent_code = 'platform-operations', sort_order = 410 WHERE code = 'platform-scheduled-tasks';
UPDATE app_menus SET parent_code = 'platform-operations', sort_order = 420 WHERE code = 'platform-settings';
UPDATE app_menus SET parent_code = 'platform-content', sort_order = 510 WHERE code = 'platform-dictionaries';
UPDATE app_menus SET parent_code = 'platform-system', sort_order = 610 WHERE code = 'platform-navigation';
UPDATE app_menus SET parent_code = 'platform-devtools', sort_order = 910 WHERE code = 'platform-mqtt-test';

-- WebSocket diagnostics are a platform developer tool.
UPDATE app_menus SET scope = 'platform', parent_code = 'platform-devtools', sort_order = 920 WHERE code = 'websocket-test';

-- Tenant menu directories.
INSERT INTO app_menus (code, parent_code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code) VALUES
('tenant-collaboration', NULL, 'directory', NULL, '协作', 'menu.tenant-collaboration', 'appstore', 100, 'tenant', 'user', NULL),
('tenant-settings', NULL, 'directory', NULL, '租户设置', 'menu.tenant-settings', 'setting', 200, 'tenant', 'admin', NULL),
('tenant-samples', NULL, 'directory', NULL, '示例', 'menu.tenant-samples', 'appstore', 300, 'tenant', 'user', NULL),
('tenant-devtools', NULL, 'directory', NULL, '开发工具', 'menu.tenant-devtools', 'api', 900, 'tenant', 'admin', NULL);

UPDATE app_menus SET parent_code = 'tenant-collaboration', sort_order = 110 WHERE code = 'files';
UPDATE app_menus SET parent_code = 'tenant-collaboration', sort_order = 120 WHERE code = 'chatbot';
UPDATE app_menus SET parent_code = 'tenant-settings', sort_order = 210 WHERE code = 'tenant-members';
UPDATE app_menus SET parent_code = 'tenant-settings', sort_order = 220 WHERE code = 'tenant-roles';
UPDATE app_menus SET parent_code = 'tenant-settings', sort_order = 230 WHERE code = 'tenant-dictionaries';
UPDATE app_menus SET parent_code = 'tenant-settings', sort_order = 240 WHERE code = 'tenant-mqtt';
UPDATE app_menus SET parent_code = 'tenant-devtools', sort_order = 910 WHERE code = 'tenant-mqtt-test';
UPDATE app_menus SET parent_code = 'tenant-samples', sort_order = 310 WHERE code = 'dashboard';
UPDATE app_menus SET parent_code = 'dashboard', sort_order = 320 WHERE code = 'dashboard-analysis';
UPDATE app_menus SET parent_code = 'dashboard', sort_order = 330 WHERE code = 'dashboard-monitor';
UPDATE app_menus SET parent_code = 'dashboard', sort_order = 340 WHERE code = 'dashboard-workplace';
UPDATE app_menus SET parent_code = 'tenant-samples', sort_order = 350 WHERE code = 'admin';
UPDATE app_menus SET parent_code = 'admin', sort_order = 360 WHERE code = 'admin-sub-page';
UPDATE app_menus SET parent_code = 'tenant-samples', sort_order = 370 WHERE code = 'form';
UPDATE app_menus SET parent_code = 'form', sort_order = 380 WHERE code = 'form-basic-form';
UPDATE app_menus SET parent_code = 'form', sort_order = 390 WHERE code = 'form-step-form';
UPDATE app_menus SET parent_code = 'form', sort_order = 400 WHERE code = 'form-advanced-form';
UPDATE app_menus SET parent_code = 'tenant-samples', sort_order = 410 WHERE code = 'list';
UPDATE app_menus SET parent_code = 'list', sort_order = 420 WHERE code = 'list-search-list';
UPDATE app_menus SET parent_code = 'list-search-list', sort_order = 430 WHERE code = 'list-search-list-articles';
UPDATE app_menus SET parent_code = 'list-search-list', sort_order = 440 WHERE code = 'list-search-list-projects';
UPDATE app_menus SET parent_code = 'list-search-list', sort_order = 450 WHERE code = 'list-search-list-applications';
UPDATE app_menus SET parent_code = 'list', sort_order = 460 WHERE code = 'list-table-list';
UPDATE app_menus SET parent_code = 'list', sort_order = 470 WHERE code = 'list-basic-list';
UPDATE app_menus SET parent_code = 'list', sort_order = 480 WHERE code = 'list-card-list';
UPDATE app_menus SET parent_code = 'tenant-samples', sort_order = 500 WHERE code = 'profile';
UPDATE app_menus SET parent_code = 'profile', sort_order = 510 WHERE code = 'profile-basic';
UPDATE app_menus SET parent_code = 'profile', sort_order = 520 WHERE code = 'profile-advanced';
UPDATE app_menus SET parent_code = 'tenant-samples', sort_order = 530 WHERE code = 'result';
UPDATE app_menus SET parent_code = 'result', sort_order = 540 WHERE code = 'result-success';
UPDATE app_menus SET parent_code = 'result', sort_order = 550 WHERE code = 'result-fail';
