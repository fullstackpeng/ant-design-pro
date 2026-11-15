import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDateTimePicker,
  ProFormDependency,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import { listPlans } from '../plans/service';
import { useManagement } from '../useManagement';
import {
  assignPlan,
  createTenant,
  listTenants,
  type Tenant,
  updateTenant,
} from './service';

interface TenantForm {
  code: string;
  name: string;
  isActive: boolean;
  mode: 'new' | 'existing';
  username: string;
  adminName?: string;
  password?: string;
}
export default function Tenants() {
  const { t, run, load } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Tenant | null>();
  const [assigning, setAssigning] = useState<Tenant>();
  const reload = () => {
    action.current?.reload();
  };
  const columns: ProColumns<Tenant>[] = [
    { title: t('code', '编码'), dataIndex: 'code', search: false },
    { title: t('tenantName', '企业名称'), dataIndex: 'name' },
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
      title: t('activeMembers', '启用成员'),
      search: false,
      render: (_, row) => row._count.memberships,
    },
    {
      title: t('plan', '套餐'),
      search: false,
      render: (_, row) =>
        row.subscription?.plan.name ?? t('unassigned', '未分配'),
    },
    {
      title: t('expiresAt', '到期时间'),
      search: false,
      render: (_, row) =>
        row.subscription
          ? new Date(row.subscription.expiresAt).toLocaleString()
          : '-',
    },
    {
      title: t('subscriptionStatus', '订阅状态'),
      search: false,
      render: (_, row) => {
        const sub = row.subscription;
        return !sub
          ? '-'
          : !sub.isActive
            ? t('disabled', '停用')
            : new Date(sub.expiresAt) <= new Date()
              ? t('expired', '已到期')
              : t('valid', '有效');
      },
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="edit" type="link" onClick={() => setEditing(row)}>
          {t('edit', '编辑')}
        </Button>,
        <Button key="assign" type="link" onClick={() => setAssigning(row)}>
          {t('assignPlan', '分配套餐')}
        </Button>,
      ],
    },
  ];
  return (
    <PageContainer
      title={t('tenants', '租户管理')}
      content={t(
        'tenantsHelp',
        '创建企业并指定首位管理员，再手动分配套餐。编码创建后不可修改。',
      )}
    >
      <ProTable<Tenant>
        rowKey="id"
        actionRef={action}
        columns={columns}
        request={(params) => load(() => listTenants(params))}
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={() => setEditing(null)}>
            {t('createTenant', '新增租户')}
          </Button>,
        ]}
      />
      {editing !== undefined && (
        <ModalForm<TenantForm>
          title={
            editing
              ? t('editTenant', '编辑租户')
              : t('createTenant', '新增租户')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={editing ?? { mode: 'new' }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updateTenant(editing.id, {
                      name: values.name,
                      isActive: values.isActive,
                    })
                  : createTenant({
                      code: values.code,
                      name: values.name,
                      admin: {
                        mode: values.mode,
                        username: values.username,
                        name: values.adminName,
                        password: values.password,
                      },
                    }),
              () => {
                setEditing(undefined);
                reload();
              },
            )
          }
        >
          <ProFormText
            name="code"
            label={t('tenantCode', '租户编码')}
            disabled={!!editing}
            rules={[
              { required: true },
              { pattern: /^[a-z0-9][a-z0-9-]{0,63}$/ },
            ]}
          />
          <ProFormText
            name="name"
            label={t('tenantName', '企业名称')}
            rules={[{ required: true }, { max: 100 }]}
          />
          {editing ? (
            <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
          ) : (
            <>
              <ProFormSelect
                name="mode"
                label={t('initialAdmin', '首位管理员')}
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
                        name="adminName"
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
        </ModalForm>
      )}
      {assigning && (
        <ModalForm<{ planId: string; expiresAt: string; isActive: boolean }>
          title={`${t('assignPlan', '分配套餐')} · ${assigning.name}`}
          open
          onOpenChange={(open) => {
            if (!open) setAssigning(undefined);
          }}
          initialValues={{
            planId: assigning.subscription?.planId,
            expiresAt: assigning.subscription
              ? dayjs(assigning.subscription.expiresAt)
              : dayjs().add(1, 'year'),
            isActive: assigning.subscription?.isActive ?? true,
          }}
          onFinish={(values) =>
            run(
              () =>
                assignPlan(assigning.id, {
                  ...values,
                  expiresAt: dayjs(values.expiresAt).toISOString(),
                }),
              () => {
                setAssigning(undefined);
                reload();
              },
            )
          }
        >
          <ProFormSelect
            name="planId"
            label={t('plan', '套餐')}
            request={async () => {
              const plans = await load(() =>
                listPlans({ current: 1, pageSize: 100 }),
              );
              return plans.data
                .filter((plan) => plan.isActive)
                .map((plan) => ({
                  value: plan.id,
                  label: `${plan.name} (${plan.maxMembers})`,
                }));
            }}
            rules={[{ required: true }]}
          />
          <ProFormDateTimePicker
            name="expiresAt"
            label={t('expiresAt', '到期时间')}
            rules={[{ required: true }]}
            fieldProps={{
              disabledDate: (date) => date.endOf('day').isBefore(dayjs()),
            }}
          />
          <ProFormSwitch
            name="isActive"
            label={t('subscriptionEnabled', '订阅启用')}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
