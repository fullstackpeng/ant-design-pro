import { BadRequestException } from '@nestjs/common';
import { registeredPages } from './page-registry.js';

interface PermissionDefinition {
  code: string;
  name: string;
  featureCode: string;
  defaultMemberAccess: boolean;
  requires: string[];
}

// Page permissions live with their pages; action dependencies are declared here.
export const permissionCatalog: PermissionDefinition[] = [
  ...['create', 'update'].map((action) => ({
    code: `dictionaries:${action}`,
    name: action === 'create' ? '新增字典及字典项' : '编辑字典及字典项',
    featureCode: 'dictionaries',
    defaultMemberAccess: false,
    requires: ['dictionaries:read'],
  })),
  ...registeredPages.flatMap((page) =>
    page.permissionCode && page.featureCode
      ? [
          {
            code: page.permissionCode,
            name: page.name,
            featureCode: page.featureCode,
            defaultMemberAccess: page.defaultMemberAccess,
            requires: [],
          },
        ]
      : [],
  ),
  ...[
    ['create', '上传文件'],
    ['delete', '删除文件'],
  ].map(([action, name]) => ({
    code: `files:${action}`,
    name,
    featureCode: 'files',
    defaultMemberAccess: false,
    requires: ['files:read'],
  })),
  {
    code: 'members:create',
    name: '新增成员',
    featureCode: 'members',
    defaultMemberAccess: false,
    requires: ['members:read'],
  },
  {
    code: 'members:update',
    name: '编辑成员',
    featureCode: 'members',
    defaultMemberAccess: false,
    requires: ['members:read'],
  },
  {
    code: 'members:delete',
    name: '移除成员',
    featureCode: 'members',
    defaultMemberAccess: false,
    requires: ['members:read'],
  },
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
