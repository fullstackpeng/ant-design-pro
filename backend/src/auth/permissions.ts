import { BadRequestException } from '@nestjs/common';
import { registeredPages } from './page-registry.js';

export type PermissionGroup =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage';

export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  featureCode: string;
  kind: 'page' | 'action';
  group: PermissionGroup;
  risk: 'normal' | 'destructive';
  defaultMemberAccess: boolean;
  requires: string[];
}

function action(
  code: string,
  name: string,
  featureCode: string,
  requires: string[],
  group: PermissionGroup,
  description: string,
  risk: 'normal' | 'destructive' = 'normal',
): PermissionDefinition {
  return {
    code,
    name,
    description,
    featureCode,
    kind: 'action',
    group,
    risk,
    defaultMemberAccess: false,
    requires,
  };
}

// Page permissions live with their pages; action dependencies are declared here.
export const permissionCatalog: PermissionDefinition[] = [
  ...(['departments', 'positions'] as const).flatMap((entity) =>
    (['create', 'update', 'delete'] as const).map((operation) => {
      const name = entity === 'departments' ? '部门' : '岗位';
      const verb = { create: '新增', update: '编辑', delete: '删除' }[
        operation
      ];
      return action(
        `${entity}:${operation}`,
        `${verb}${name}`,
        'members',
        [`${entity}:read`],
        operation,
        `${verb}当前租户${name}`,
        operation === 'delete' ? 'destructive' : 'normal',
      );
    }),
  ),
  ...['create', 'update'].map((item) =>
    action(
      `dictionaries:${item}`,
      item === 'create' ? '新增字典及字典项' : '编辑字典及字典项',
      'dictionaries',
      ['dictionaries:read'],
      item === 'create' ? 'create' : 'update',
      item === 'create' ? '新增字典类型或选项' : '修改已有字典类型或选项',
    ),
  ),
  ...registeredPages.flatMap((page) =>
    page.permissionCode && page.featureCode
      ? [
          {
            code: page.permissionCode,
            name: page.name,
            description: `查看${page.name}`,
            featureCode: page.featureCode,
            kind: 'page' as const,
            group: 'read' as const,
            risk: 'normal' as const,
            defaultMemberAccess: page.defaultMemberAccess,
            requires: [] as string[],
          },
        ]
      : [],
  ),
  action(
    'mqtt:manage',
    '维护 MQTT Broker',
    'mqtt',
    ['mqtt:read'],
    'manage',
    '新增、修改、启停和删除租户自有 MQTT Broker',
  ),
  action(
    'mqtt:credentials',
    '查看或轮换 MQTT 凭据',
    'mqtt',
    ['mqtt:read'],
    'manage',
    '二次校验登录密码后查看或轮换平台 Broker 凭据',
    'destructive',
  ),
  action(
    'files:create',
    '上传文件',
    'files',
    ['files:read'],
    'create',
    '向当前租户空间上传文件',
  ),
  action(
    'files:delete',
    '删除文件',
    'files',
    ['files:read'],
    'delete',
    '删除当前租户的文件记录和存储对象',
    'destructive',
  ),
  action(
    'members:create',
    '新增成员',
    'members',
    ['members:read'],
    'create',
    '邀请或新建成员并分配角色',
  ),
  action(
    'members:update',
    '编辑成员',
    'members',
    ['members:read'],
    'update',
    '修改成员角色、启用状态、自定义角色、部门和岗位',
  ),
  action(
    'members:delete',
    '移除成员',
    'members',
    ['members:read'],
    'delete',
    '将成员移出租户',
    'destructive',
  ),
  ...['create', 'update', 'delete'].map((item) =>
    action(
      `notifications:${item}`,
      item === 'create'
        ? '新建通知公告'
        : item === 'update'
          ? '编辑通知公告'
          : '删除通知公告',
      'notifications',
      ['notifications:read'],
      item === 'create' ? 'create' : item === 'update' ? 'update' : 'delete',
      item === 'create'
        ? '创建通知或公告并设置接收范围'
        : item === 'update'
          ? '修改通知或公告内容及接收范围'
          : '删除当前租户发布的通知或公告',
      item === 'delete' ? 'destructive' : 'normal',
    ),
  ),
];

export function availablePermissions(featureCodes: string[]) {
  return permissionCatalog.filter((permission) =>
    featureCodes.includes(permission.featureCode),
  );
}

export function validatePermissions(codes: string[], featureCodes: string[]) {
  const available = availablePermissions(featureCodes);
  for (const code of codes) {
    const permission = available.find((item) => item.code === code);
    if (!permission)
      throw new BadRequestException({
        success: false,
        errorMessage: '包含未知或未开通的权限',
      });
    if (permission.requires.some((required) => !codes.includes(required)))
      throw new BadRequestException({
        success: false,
        errorMessage: '请同时分配操作所需的查看权限',
      });
  }
}
