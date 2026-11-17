import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDependency,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Alert, Button, Popconfirm, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import type { Subscription } from '../tenants/service';
import { useManagement } from '../useManagement';
import {
  addMember,
  listMembers,
  listRoles,
  type Member,
  removeMember,
  subscriptionInfo,
  updateMember,
} from './service';

interface MemberForm {
  mode: 'new' | 'existing';
  username: string;
  name?: string;
  password?: string;
  role: 'admin' | 'user';
  roleIds?: string[];
  isActive: boolean;
}
export default function Members() {
  const { t, run, load, report, pending } = useManagement();
  const { initialState } = useModel('@@initialState');
  const permissions = initialState?.navigation?.permissions ?? [];
  const can = (code: string) => permissions.includes(code);
  const isAdmin = initialState?.currentUser?.access === 'admin';
  const [customRoles, setCustomRoles] = useState<BackendAPI.RoleDto[]>([]);
  useEffect(() => {
    if (isAdmin)
      listRoles()
        .then((result) => setCustomRoles(result.data))
        .catch(report);
  }, [isAdmin]);
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Member | null>();
  const [usage, setUsage] = useState<{
    subscription: Subscription | null;
    used: number;
  }>();
  const refreshUsage = () => {
    subscriptionInfo()
      .then((result) => setUsage(result.data))
      .catch(report);
  };
  useEffect(() => {
    refreshUsage();
  }, []);
  const reload = () => {
    action.current?.reload();
    refreshUsage();
  };
  const refreshMember = (userId: string) => {
    if (userId === initialState?.currentUser?.userid)
      window.location.href = '/welcome';
    else reload();
  };
  const roles = [
    { value: 'admin', label: t('administrator', '管理员') },
    { value: 'user', label: t('member', '普通成员') },
  ];
  const columns: ProColumns<Member>[] = [
    { title: t('username', '用户名'), dataIndex: ['user', 'username'] },
    { title: t('personName', '姓名'), dataIndex: ['user', 'name'] },
    {
      title: t('role', '角色'),
      dataIndex: 'role',
      render: (_, row) =>
        row.role === 'admin'
          ? t('administrator', '管理员')
          : row.roles.length
            ? row.roles.map((role) => role.name).join('、')
            : t('member', '普通成员'),
    },
    {
      title: t('status', '状态'),
      dataIndex: 'isActive',
      render: (_, row) => (
        <Tag color={row.isActive ? 'green' : 'default'}>
          {row.isActive ? t('enabled', '启用') : t('disabled', '停用')}
        </Tag>
      ),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        can('members:update') && (isAdmin || row.role !== 'admin') && (
          <Button key="edit" type="link" onClick={() => setEditing(row)}>
            {t('edit', '编辑')}
          </Button>
        ),
        can('members:delete') && (isAdmin || row.role !== 'admin') && (
          <Popconfirm
            key="remove"
            title={t(
              'removeConfirm',
              '移除该成员？账号及其他企业的成员关系将保留。',
            )}
            onConfirm={() =>
              run(
                () => removeMember(row.userId),
                () => refreshMember(row.userId),
              )
            }
            okButtonProps={{ loading: pending }}
          >
            <Button type="link" danger>
              {t('remove', '移除')}
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];
  const sub = usage?.subscription;
  const valid =
    sub?.isActive &&
    new Date(sub.expiresAt) > new Date() &&
    new Date(sub.startsAt) <= new Date();
  return (
    <PageContainer
      title={t('members', '租户成员')}
      content={initialState?.currentUser?.tenant?.name}
    >
      {usage && (
        <Alert
          className="mb-4"
          type={valid ? 'info' : 'warning'}
          showIcon
          title={`${sub?.plan.name ?? t('unassigned', '未分配')} · ${t('activeMembers', '启用成员')} ${usage.used}/${sub?.plan.maxMembers ?? '-'} · ${valid ? t('valid', '有效') : t('unavailable', '未生效、停用或已到期')}`}
          description={
            sub
              ? `${t('expiresAt', '到期时间')}：${new Date(sub.expiresAt).toLocaleString()}`
              : t('contactPlatform', '请联系平台管理员分配套餐')
          }
        />
      )}
      <ProTable<Member>
        rowKey="userId"
        actionRef={action}
        columns={columns}
        search={false}
        request={(params) => load(() => listMembers(params))}
        toolBarRender={() => [
          can('members:create') && (
            <Button key="new" type="primary" onClick={() => setEditing(null)}>
              {t('addMember', '添加成员')}
            </Button>
          ),
        ]}
      />
      {editing !== undefined && (
        <ModalForm<MemberForm>
          title={
            editing ? t('editMember', '编辑成员') : t('addMember', '添加成员')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={
            editing
              ? { ...editing, roleIds: editing.roles.map((role) => role.id) }
              : { mode: 'new', role: 'user', isActive: true, roleIds: [] }
          }
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updateMember(editing.userId, {
                      ...(isAdmin ? { roleIds: values.roleIds } : {}),
                      role: isAdmin ? values.role : 'user',
                      isActive: values.isActive,
                    })
                  : addMember({
                      ...values,
                      role: isAdmin ? values.role : 'user',
                      roleIds: isAdmin ? values.roleIds : undefined,
                    }),
              () => {
                const userId = editing?.userId;
                setEditing(undefined);
                if (userId) refreshMember(userId);
                else reload();
              },
            )
          }
        >
          {!editing && (
            <>
              <ProFormSelect
                name="mode"
                label={t('accountMode', '账号方式')}
                options={[
                  { value: 'new', label: t('newAccount', '新建账号') },
                  {
                    value: 'existing',
                    label: t('existingAccount', '已有账号'),
                  },
                ]}
                rules={[{ required: true }]}
              />
              <ProFormText
                name="username"
                label={t('username', '用户名')}
                rules={[{ required: true }, { max: 64 }]}
              />
              <ProFormDependency name={['mode']}>
                {({ mode }) =>
                  mode === 'new' ? (
                    <>
                      <ProFormText
                        name="name"
                        label={t('personName', '姓名')}
                        rules={[{ required: true }, { max: 100 }]}
                      />
                      <ProFormText.Password
                        name="password"
                        label={t('initialPassword', '初始密码')}
                        rules={[{ required: true }, { min: 8 }, { max: 1024 }]}
                      />
                    </>
                  ) : null
                }
              </ProFormDependency>
            </>
          )}
          {isAdmin && (
            <ProFormSelect
              name="role"
              label={t('role', '角色')}
              options={roles}
              rules={[{ required: true }]}
            />
          )}
          {isAdmin && (
            <ProFormSelect
              name="roleIds"
              label={t('customRoles', '自定义角色')}
              mode="multiple"
              options={customRoles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
              extra={t(
                'customRolesHelp',
                '管理员身份拥有全部已开通权限；普通成员分配多个角色时取权限并集，留空使用基础页面权限。',
              )}
            />
          )}
          {editing && (
            <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
          )}
        </ModalForm>
      )}
    </PageContainer>
  );
}
