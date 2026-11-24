export interface RegisteredPage {
  code: string;
  path: string;
  name: string;
  scope: 'authenticated' | 'platform' | 'tenant';
  featureCode: string | null;
  minRole: 'admin' | 'user';
  permissionCode: string | null;
  defaultMemberAccess: boolean;
  showInMenu: boolean;
}

type PageOptions = Partial<
  Pick<
    RegisteredPage,
    | 'featureCode'
    | 'minRole'
    | 'permissionCode'
    | 'defaultMemberAccess'
    | 'showInMenu'
  >
>;

function page(
  code: string,
  path: string,
  name: string,
  scope: RegisteredPage['scope'],
  options: PageOptions = {},
): RegisteredPage {
  return {
    code,
    path,
    name,
    scope,
    featureCode: null,
    minRole: 'user',
    permissionCode: null,
    defaultMemberAccess: false,
    showInMenu: true,
    ...options,
  };
}

// Authorization is code-owned; editable menus only organize navigation.
export const registeredPages: RegisteredPage[] = [
  page(
    'platform-audit-operation',
    '/platform/audit/operation-logs',
    '操作日志',
    'platform',
  ),
  page(
    'platform-audit-login',
    '/platform/audit/login-logs',
    '登录日志',
    'platform',
  ),
  page(
    'tenant-audit-operation',
    '/tenant/audit/operation-logs',
    '操作日志',
    'tenant',
    {
      featureCode: 'audit',
      permissionCode: 'audit:operation:read',
      defaultMemberAccess: false,
    },
  ),
  page('tenant-audit-login', '/tenant/audit/login-logs', '登录日志', 'tenant', {
    featureCode: 'audit',
    permissionCode: 'audit:login:read',
    defaultMemberAccess: false,
  }),
  page('welcome', '/welcome', '首页', 'authenticated'),
  page('websocket-test', '/websocket', 'WebSocket 测试', 'platform'),
  page('account-center', '/account/center', '个人中心', 'authenticated', {
    showInMenu: false,
  }),
  page('account-settings', '/account/settings', '个人设置', 'authenticated', {
    showInMenu: false,
  }),
  page('platform-tenants', '/platform/tenants', '租户管理', 'platform'),
  page('platform-plans', '/platform/plans', '套餐管理', 'platform'),
  page(
    'platform-scheduled-tasks',
    '/platform/scheduled-tasks',
    '定时任务',
    'platform',
  ),
  page(
    'platform-dictionaries',
    '/platform/dictionaries',
    '平台字典',
    'platform',
  ),
  page('platform-users', '/platform/users', '用户管理', 'platform'),
  page(
    'platform-notifications',
    '/platform/notifications',
    '通知公告',
    'platform',
  ),
  page(
    'platform-storage-providers',
    '/platform/storage-providers',
    '存储服务商',
    'platform',
  ),
  page('platform-files', '/platform/files', '文件管理', 'platform'),
  page('platform-mqtt', '/platform/mqtt-config', 'MQTT 配置', 'platform'),
  page('platform-mqtt-test', '/platform/mqtt-test', 'MQTT 测试', 'platform'),
  page(
    'platform-mqtt-messages',
    '/platform/mqtt-messages',
    'MQTT 消息',
    'platform',
  ),
  page('tenant-mqtt', '/tenant/mqtt-config', 'MQTT 配置', 'tenant', {
    featureCode: 'mqtt',
    minRole: 'admin',
    permissionCode: 'mqtt:read',
  }),
  page('tenant-mqtt-test', '/tenant/mqtt-test', 'MQTT 测试', 'tenant', {
    featureCode: 'mqtt',
    minRole: 'admin',
    permissionCode: 'mqtt:test',
  }),
  page('files', '/files', '文件管理', 'tenant', {
    featureCode: 'files',
    permissionCode: 'files:read',
    defaultMemberAccess: true,
  }),
  page('tenant-roles', '/tenant/roles', '角色管理', 'tenant', {
    featureCode: 'members',
    minRole: 'admin',
  }),
  page('tenant-dictionaries', '/tenant/dictionaries', '字典管理', 'tenant', {
    featureCode: 'dictionaries',
    minRole: 'admin',
    permissionCode: 'dictionaries:read',
  }),
  page('platform-settings', '/platform/settings', '系统配置', 'platform'),
  page(
    'platform-navigation',
    '/platform/navigation/platform',
    '平台菜单',
    'platform',
  ),
  page(
    'platform-navigation-tenant',
    '/platform/navigation/tenant',
    '租户菜单',
    'platform',
  ),
  page('admin-sub-page', '/admin/sub-page', '管理示例', 'tenant', {
    featureCode: 'admin-demo',
    minRole: 'admin',
    permissionCode: 'admin-sub-page:view',
  }),
  page('tenant-departments', '/tenant/departments', '部门管理', 'tenant', {
    featureCode: 'members',
    permissionCode: 'departments:read',
    minRole: 'admin',
  }),
  page('tenant-positions', '/tenant/positions', '岗位管理', 'tenant', {
    featureCode: 'members',
    permissionCode: 'positions:read',
    minRole: 'admin',
  }),
  page('tenant-members', '/tenant/members', '成员管理', 'tenant', {
    featureCode: 'members',
    minRole: 'admin',
    permissionCode: 'members:read',
  }),
  page('dashboard-analysis', '/dashboard/analysis', '分析页', 'tenant', {
    featureCode: 'dashboard',
    permissionCode: 'dashboard-analysis:view',
    defaultMemberAccess: true,
  }),
  page('dashboard-monitor', '/dashboard/monitor', '监控页', 'tenant', {
    featureCode: 'dashboard',
    permissionCode: 'dashboard-monitor:view',
    defaultMemberAccess: true,
  }),
  page('dashboard-workplace', '/dashboard/workplace', '工作台', 'tenant', {
    featureCode: 'dashboard',
    permissionCode: 'dashboard-workplace:view',
    defaultMemberAccess: true,
  }),
  page('form-basic-form', '/form/basic-form', '基础表单', 'tenant', {
    featureCode: 'form',
    permissionCode: 'form-basic-form:view',
    defaultMemberAccess: true,
  }),
  page('form-step-form', '/form/step-form', '分步表单', 'tenant', {
    featureCode: 'form',
    permissionCode: 'form-step-form:view',
    defaultMemberAccess: true,
  }),
  page('form-advanced-form', '/form/advanced-form', '高级表单', 'tenant', {
    featureCode: 'form',
    permissionCode: 'form-advanced-form:view',
    defaultMemberAccess: true,
  }),
  page('list-table-list', '/list/table-list', '查询表格', 'tenant', {
    featureCode: 'list',
    permissionCode: 'list-table-list:view',
    defaultMemberAccess: true,
  }),
  page('list-basic-list', '/list/basic-list', '标准列表', 'tenant', {
    featureCode: 'list',
    permissionCode: 'list-basic-list:view',
    defaultMemberAccess: true,
  }),
  page('list-card-list', '/list/card-list', '卡片列表', 'tenant', {
    featureCode: 'list',
    permissionCode: 'list-card-list:view',
    defaultMemberAccess: true,
  }),
  page(
    'list-search-list-articles',
    '/list/search/articles',
    '搜索文章',
    'tenant',
    {
      featureCode: 'list',
      permissionCode: 'list-search-list-articles:view',
      defaultMemberAccess: true,
    },
  ),
  page(
    'list-search-list-projects',
    '/list/search/projects',
    '搜索项目',
    'tenant',
    {
      featureCode: 'list',
      permissionCode: 'list-search-list-projects:view',
      defaultMemberAccess: true,
    },
  ),
  page(
    'list-search-list-applications',
    '/list/search/applications',
    '搜索应用',
    'tenant',
    {
      featureCode: 'list',
      permissionCode: 'list-search-list-applications:view',
      defaultMemberAccess: true,
    },
  ),
  page('profile-basic', '/profile/basic', '基础详情', 'tenant', {
    featureCode: 'profile',
    permissionCode: 'profile-basic:view',
    defaultMemberAccess: true,
  }),
  page('profile-advanced', '/profile/advanced', '高级详情', 'tenant', {
    featureCode: 'profile',
    permissionCode: 'profile-advanced:view',
    defaultMemberAccess: true,
  }),
  page('result-success', '/result/success', '成功页', 'tenant', {
    featureCode: 'result',
    permissionCode: 'result-success:view',
    defaultMemberAccess: true,
  }),
  page('result-fail', '/result/fail', '失败页', 'tenant', {
    featureCode: 'result',
    permissionCode: 'result-fail:view',
    defaultMemberAccess: true,
  }),
  page('chatbot', '/chatbot', 'AI 助手', 'tenant', {
    featureCode: 'chatbot',
    permissionCode: 'chatbot:view',
    defaultMemberAccess: true,
  }),
  page(
    'tenant-notifications',
    '/message-center/notifications',
    '通知公告管理',
    'tenant',
    {
      featureCode: 'notifications',
      minRole: 'admin',
      permissionCode: 'notifications:read',
    },
  ),
  page('notifications-inbox', '/message-center/inbox', '我的消息', 'tenant', {
    featureCode: 'notifications',
    permissionCode: 'notifications:inbox:read',
    defaultMemberAccess: true,
  }),
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
  '/message-center',
];
