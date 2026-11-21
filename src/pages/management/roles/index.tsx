import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProForm,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  type Permission,
  type Role,
  updateRole,
} from './service';

interface PermissionPickerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  catalog: Permission[];
}

function PermissionPicker({
  value = [],
  onChange,
  catalog,
}: PermissionPickerProps) {
  const byCode = new Map(
    catalog.map((permission) => [permission.code, permission]),
  );

  const withDependencies = (code: string) => {
    const next = new Set(value);
    const queue = [code];
    while (queue.length) {
      const current = queue.pop();
      if (!current || next.has(current)) continue;
      next.add(current);
      for (const required of byCode.get(current)?.requires ?? []) {
        if (!next.has(required)) queue.push(required);
      }
    }
    return [...next];
  };

  const withoutDependents = (code: string) => {
    const removed = new Set([code]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const permission of catalog) {
        if (
          !removed.has(permission.code) &&
          permission.requires.some((required) => removed.has(required))
        ) {
          removed.add(permission.code);
          changed = true;
        }
      }
    }
    return value.filter((item) => !removed.has(item));
  };

  const toggle = (permission: Permission, checked: boolean) => {
    onChange?.(
      checked
        ? withDependencies(permission.code)
        : withoutDependents(permission.code),
    );
  };

  const groups = new Map<string, Permission[]>();
  for (const permission of catalog) {
    const list = groups.get(permission.featureCode) ?? [];
    list.push(permission);
    groups.set(permission.featureCode, list);
  }

  const stale = value.filter((code) => !byCode.has(code));

  const preset = (mode: 'viewer' | 'operator' | 'admin') => {
    if (mode === 'admin') {
      onChange?.(catalog.map((permission) => permission.code));
      return;
    }
    if (mode === 'viewer') {
      onChange?.(
        catalog
          .filter((permission) => permission.group === 'read')
          .map((permission) => permission.code),
      );
      return;
    }
    let codes = catalog
      .filter((permission) => permission.risk !== 'destructive')
      .map((permission) => permission.code);
    for (const code of [...codes])
      codes = withDependenciesFor(codes, byCode, code);
    onChange?.(codes);
  };

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Typography.Text type="secondary">快速预设：</Typography.Text>
        <Button size="small" onClick={() => preset('viewer')}>
          查看者
        </Button>
        <Button size="small" onClick={() => preset('operator')}>
          操作员
        </Button>
        <Button size="small" onClick={() => preset('admin')}>
          全部权限
        </Button>
      </Space>
      <Typography.Text type="secondary">
        租户管理员自动拥有全部权限；成员未分配自定义角色时使用基础权限，分配后仅使用角色权限。
      </Typography.Text>
      {stale.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`有 ${stale.length} 个权限所属功能已关闭`}
          action={
            <Button
              size="small"
              onClick={() =>
                onChange?.(value.filter((code) => byCode.has(code)))
              }
            >
              清理
            </Button>
          }
        />
      )}
      {[...groups.entries()].map(([featureCode, permissions]) => {
        const meta = permissions[0];
        const codes = permissions.map((permission) => permission.code);
        const selected = codes.filter((code) => value.includes(code));
        return (
          <Card
            key={featureCode}
            size="small"
            title={
              <Space wrap>
                <span>{meta.featureName}</span>
                {meta.isDemo && <Tag color="orange">演示</Tag>}
                <Typography.Text type="secondary">
                  {meta.featureDescription}
                </Typography.Text>
              </Space>
            }
            extra={
              <Checkbox
                checked={selected.length === codes.length}
                indeterminate={
                  selected.length > 0 && selected.length < codes.length
                }
                onChange={(event) => {
                  if (event.target.checked)
                    onChange?.([
                      ...new Set([
                        ...value,
                        ...codes.flatMap((code) => withDependencies(code)),
                      ]),
                    ]);
                  else
                    onChange?.(value.filter((code) => !codes.includes(code)));
                }}
              >
                全选
              </Checkbox>
            }
          >
            <Space
              orientation="vertical"
              size="small"
              style={{ width: '100%' }}
            >
              {permissions.map((permission) => (
                <Checkbox
                  key={permission.code}
                  checked={value.includes(permission.code)}
                  onChange={(event) => toggle(permission, event.target.checked)}
                >
                  <Space wrap>
                    <span>{permission.name}</span>
                    {permission.risk === 'destructive' && (
                      <Tag color="red">高风险</Tag>
                    )}
                  </Space>
                  <div>
                    <Typography.Text type="secondary">
                      {permission.description}
                    </Typography.Text>
                  </div>
                </Checkbox>
              ))}
            </Space>
          </Card>
        );
      })}
    </Space>
  );
}

function withDependenciesFor(
  value: string[],
  byCode: Map<string, Permission>,
  code: string,
) {
  const next = new Set(value);
  const queue = [code];
  while (queue.length) {
    const current = queue.pop();
    if (!current || next.has(current)) continue;
    next.add(current);
    for (const required of byCode.get(current)?.requires ?? []) {
      if (!next.has(required)) queue.push(required);
    }
  }
  return [...next];
}

export default function Roles() {
  const { t, run, report } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Role | null>();
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const columns: ProColumns<Role>[] = [
    { title: t('roleName', '角色名称'), dataIndex: 'name' },
    {
      title: t('permissions', '权限'),
      render: (_, row) =>
        row.permissions.map((code) => (
          <Tag key={code}>
            {catalog.find((p) => p.code === code)?.name ?? code}
          </Tag>
        )),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="edit" type="link" onClick={() => setEditing(row)}>
          {t('edit', '编辑')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t('deleteRoleConfirm', '删除角色？请先解除成员关联。')}
          onConfirm={() =>
            run(
              () => deleteRole(row.id),
              () => {
                action.current?.reload();
              },
            )
          }
        >
          <Button type="link" danger>
            {t('deleteMenu', '删除')}
          </Button>
        </Popconfirm>,
      ],
    },
  ];
  return (
    <PageContainer
      title={t('roleManagement', '角色管理')}
      content={t(
        'roleHelp',
        '管理员拥有已开通模块的全部权限。普通成员未分配自定义角色时保留基础页面权限，分配后按所选角色的权限并集授权。角色不会开通租户未购买的模块。',
      )}
    >
      <ProTable<Role>
        rowKey="id"
        actionRef={action}
        columns={columns}
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={() => setEditing(null)}>
            {t('createRole', '新增角色')}
          </Button>,
        ]}
        request={async () => {
          try {
            const [list, permissions] = await Promise.all([
              listRoles(),
              listPermissions(),
            ]);
            setCatalog(permissions.data);
            return { ...list, total: list.data.length };
          } catch (error) {
            report(error);
            return { success: false, data: [] };
          }
        }}
      />
      {editing !== undefined && (
        <ModalForm<BackendAPI.CreateRoleDto>
          open
          width={820}
          title={
            editing ? t('editRole', '编辑角色') : t('createRole', '新增角色')
          }
          initialValues={editing ?? { permissions: [] }}
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onFinish={(values) =>
            run(
              () =>
                editing ? updateRole(editing.id, values) : createRole(values),
              () => {
                setEditing(undefined);
                action.current?.reload();
              },
            )
          }
        >
          <ProFormText
            name="name"
            label={t('roleName', '角色名称')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProForm.Item name="permissions" label={t('permissions', '权限')}>
            <PermissionPicker catalog={catalog} />
          </ProForm.Item>
        </ModalForm>
      )}
    </PageContainer>
  );
}
