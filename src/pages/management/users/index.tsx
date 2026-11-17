import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  createUser,
  listUsers,
  resetUserPassword,
  type User,
  updateUser,
} from './service';

interface UserForm {
  username: string;
  name: string;
  password: string;
  isActive: boolean;
}
export default function Users() {
  const { t, run, load } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<User | null>();
  const [resetting, setResetting] = useState<User>();
  const columns: ProColumns<User>[] = [
    {
      title: t('searchUsers', '账号或姓名'),
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: t('username', '用户名'), dataIndex: 'username', search: false },
    { title: t('personName', '姓名'), dataIndex: 'name', search: false },
    {
      title: t('platformAdmin', '平台管理员'),
      dataIndex: 'isPlatformAdmin',
      search: false,
      render: (_, row) =>
        row.isPlatformAdmin ? t('yes', '是') : t('no', '否'),
    },
    {
      title: t('status', '状态'),
      dataIndex: 'isActive',
      search: false,
      render: (_, row) => (
        <Tag color={row.isActive ? 'green' : 'default'}>
          {row.isActive ? t('enabled', '启用') : t('disabled', '停用')}
        </Tag>
      ),
    },
    {
      title: t('tenantMemberships', '所属租户'),
      search: false,
      render: (_, row) =>
        row.memberships.map((m) => (
          <Tag key={m.tenantId}>
            {m.tenantName} ·{' '}
            {m.role === 'admin'
              ? t('administrator', '管理员')
              : t('member', '普通成员')}{' '}
            · {m.isActive ? t('enabled', '启用') : t('disabled', '停用')}
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
        <Button key="reset" type="link" onClick={() => setResetting(row)}>
          {t('resetPassword', '重置密码')}
        </Button>,
      ],
    },
  ];
  return (
    <PageContainer
      title={t('userManagement', '用户管理')}
      content={t(
        'usersHelp',
        '管理全局账号。停用账号会阻止其登录所有租户；重置密码会撤销全部会话。新建账号后，请在租户成员管理中添加该账号。',
      )}
    >
      <ProTable<User>
        rowKey="id"
        actionRef={action}
        columns={columns}
        request={(params) => load(() => listUsers(params))}
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={() => setEditing(null)}>
            {t('createUser', '新增用户')}
          </Button>,
        ]}
      />
      {editing !== undefined && (
        <ModalForm<UserForm>
          open
          title={
            editing ? t('editUser', '编辑用户') : t('createUser', '新增用户')
          }
          initialValues={editing ?? { isActive: true }}
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updateUser(editing.id, {
                      name: values.name,
                      isActive: values.isActive,
                    })
                  : createUser({
                      username: values.username,
                      name: values.name,
                      password: values.password,
                    }),
              () => {
                setEditing(undefined);
                action.current?.reload();
              },
            )
          }
        >
          <ProFormText
            name="username"
            label={t('username', '用户名')}
            disabled={!!editing}
            rules={[{ required: true, whitespace: true }, { max: 64 }]}
          />
          <ProFormText
            name="name"
            label={t('personName', '姓名')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          {editing ? (
            <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
          ) : (
            <ProFormText.Password
              name="password"
              label={t('initialPassword', '初始密码')}
              rules={[{ required: true }, { min: 8, max: 1024 }]}
            />
          )}
        </ModalForm>
      )}
      {resetting && (
        <ModalForm<{ password: string }>
          open
          title={`${t('resetPassword', '重置密码')} · ${resetting.username}`}
          onOpenChange={(open) => {
            if (!open) setResetting(undefined);
          }}
          onFinish={(values) =>
            run(
              () => resetUserPassword(resetting.id, values),
              () => setResetting(undefined),
            )
          }
        >
          <ProFormText.Password
            name="password"
            label={t('newPassword', '新密码')}
            rules={[{ required: true }, { min: 8, max: 1024 }]}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
