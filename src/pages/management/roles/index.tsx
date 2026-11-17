import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Tag } from 'antd';
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
          <ProFormSelect
            name="permissions"
            label={t('permissions', '权限')}
            mode="multiple"
            options={Array.from(new Set(catalog.map((p) => p.featureCode))).map(
              (feature) => ({
                label: feature,
                options: catalog
                  .filter((p) => p.featureCode === feature)
                  .map((p) => ({
                    label: `${p.name} (${p.code})`,
                    value: p.code,
                  })),
              }),
            )}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
