UPDATE app_menus
SET name = '平台菜单', i18n_key = 'menu.platform.navigation'
WHERE code = 'platform-navigation';

INSERT INTO app_menus (code, parent_code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code)
VALUES (
  'platform-navigation-tenant',
  'platform-system',
  'page',
  '/platform/navigation/tenant',
  '租户菜单',
  'menu.platform.navigation-tenant',
  'menu',
  620,
  'platform',
  'user',
  NULL
);
