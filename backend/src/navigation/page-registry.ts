export interface RegisteredPage {
  code: string;
  path: string;
  name: string;
  scope: 'authenticated' | 'platform' | 'tenant';
  featureCode: string | null;
  minRole: 'admin' | 'user';
}

function page(
  code: string,
  path: string,
  name: string,
  scope: RegisteredPage['scope'],
  featureCode: string | null = null,
  minRole: RegisteredPage['minRole'] = 'user',
): RegisteredPage {
  return { code, path, name, scope, featureCode, minRole };
}

// Code-owned page capabilities. Menu edits cannot change these authorization requirements.
export const registeredPages: RegisteredPage[] = [
  page('welcome', '/welcome', '首页', 'authenticated'),
  page('account-center', '/account/center', '个人中心', 'authenticated'),
  page('account-settings', '/account/settings', '个人设置', 'authenticated'),
  page('platform-tenants', '/platform/tenants', '租户管理', 'platform'),
  page('platform-plans', '/platform/plans', '套餐管理', 'platform'),
  page('platform-navigation', '/platform/navigation', '菜单管理', 'platform'),
  page(
    'admin-sub-page',
    '/admin/sub-page',
    '管理示例',
    'tenant',
    'admin-demo',
    'admin',
  ),
  page(
    'tenant-members',
    '/tenant/members',
    '成员管理',
    'tenant',
    'members',
    'admin',
  ),
  page(
    'dashboard-analysis',
    '/dashboard/analysis',
    '分析页',
    'tenant',
    'dashboard',
  ),
  page(
    'dashboard-monitor',
    '/dashboard/monitor',
    '监控页',
    'tenant',
    'dashboard',
  ),
  page(
    'dashboard-workplace',
    '/dashboard/workplace',
    '工作台',
    'tenant',
    'dashboard',
  ),
  page('form-basic-form', '/form/basic-form', '基础表单', 'tenant', 'form'),
  page('form-step-form', '/form/step-form', '分步表单', 'tenant', 'form'),
  page(
    'form-advanced-form',
    '/form/advanced-form',
    '高级表单',
    'tenant',
    'form',
  ),
  page('list-table-list', '/list/table-list', '查询表格', 'tenant', 'list'),
  page('list-basic-list', '/list/basic-list', '标准列表', 'tenant', 'list'),
  page('list-card-list', '/list/card-list', '卡片列表', 'tenant', 'list'),
  page(
    'list-search-list-articles',
    '/list/search/articles',
    '搜索文章',
    'tenant',
    'list',
  ),
  page(
    'list-search-list-projects',
    '/list/search/projects',
    '搜索项目',
    'tenant',
    'list',
  ),
  page(
    'list-search-list-applications',
    '/list/search/applications',
    '搜索应用',
    'tenant',
    'list',
  ),
  page('profile-basic', '/profile/basic', '基础详情', 'tenant', 'profile'),
  page(
    'profile-advanced',
    '/profile/advanced',
    '高级详情',
    'tenant',
    'profile',
  ),
  page('result-success', '/result/success', '成功页', 'tenant', 'result'),
  page('result-fail', '/result/fail', '失败页', 'tenant', 'result'),
  page('chatbot', '/chatbot', 'AI 助手', 'tenant', 'chatbot'),
];

export const directoryPaths = [
  '/admin',
  '/platform',
  '/dashboard',
  '/form',
  '/list',
  '/list/search',
  '/profile',
  '/result',
  '/account',
];

export function isSystemMenu(menu: { code: string; scope: string }) {
  return (
    menu.scope === 'authenticated' ||
    [
      'platform',
      'platform-tenants',
      'platform-plans',
      'platform-navigation',
    ].includes(menu.code)
  );
}
