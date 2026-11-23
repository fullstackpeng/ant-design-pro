import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Alert, Avatar, Button, Card, Descriptions, Space, Tag } from 'antd';
import React from 'react';
import { useAccountProfile } from '../useAccountProfile';

export default function Center() {
  const { data: profile, isPending, isError, refetch, t } = useAccountProfile();
  const { initialState } = useModel('@@initialState');
  const allowedPaths = initialState?.navigation?.allowedPaths ?? [];
  const tenant = profile?.tenant;
  const disabled = t('disabled', '停用');
  return (
    <PageContainer title={t('center', '个人中心')}>
      {isError ? (
        <Alert
          type="error"
          showIcon
          title={t('loadFailed', '个人资料加载失败')}
          action={
            <Button onClick={() => void refetch()}>{t('retry', '重试')}</Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card loading={isPending}>
            {profile && (
              <div className="flex flex-col items-center gap-4 py-4">
                <Avatar size={88} src={profile.avatar ?? undefined}>
                  {profile.name.slice(0, 1)}
                </Avatar>
                <div className="text-xl font-semibold">{profile.name}</div>
                <div>{profile.username}</div>
                <Tag color="blue">
                  {profile.isPlatformAdmin
                    ? t('platformAdmin', '平台管理员')
                    : tenant?.role === 'admin'
                      ? t('tenantAdmin', '租户管理员')
                      : t('member', '普通成员')}
                </Tag>
                <Button
                  type="primary"
                  onClick={() => history.push('/account/settings')}
                >
                  {t('editProfile', '编辑资料')}
                </Button>
              </div>
            )}
          </Card>
          <div className="flex flex-col gap-6">
            <Card
              title={t('currentIdentity', '当前登录身份')}
              loading={isPending}
            >
              {profile &&
                (tenant ? (
                  <Descriptions
                    column={1}
                    items={[
                      {
                        key: 'tenant',
                        label: t('tenant', '当前企业'),
                        children: tenant.name,
                      },
                      {
                        key: 'code',
                        label: t('tenantCode', '企业编码'),
                        children: tenant.code,
                      },
                      {
                        key: 'department',
                        label: t('department', '部门'),
                        children: tenant.department
                          ? `${tenant.department.path}${tenant.department.isActive ? '' : `（${disabled}）`}`
                          : t('unassigned', '未分配'),
                      },
                      {
                        key: 'positions',
                        label: t('positions', '岗位'),
                        children: tenant.positions.length ? (
                          <Space wrap>
                            {tenant.positions.map((position) => (
                              <Tag key={position.id}>
                                {position.name}
                                {!position.isActive && `（${disabled}）`}
                              </Tag>
                            ))}
                          </Space>
                        ) : (
                          t('unassigned', '未分配')
                        ),
                      },
                      {
                        key: 'roles',
                        label: t('roles', '自定义角色'),
                        children: tenant.roles.length ? (
                          <Space wrap>
                            {tenant.roles.map((role) => (
                              <Tag key={role.id}>{role.name}</Tag>
                            ))}
                          </Space>
                        ) : (
                          t('noCustomRoles', '未分配自定义角色')
                        ),
                      },
                    ]}
                  />
                ) : (
                  <p>{t('platformContext', '当前以平台管理员身份登录。')}</p>
                ))}
              {tenant && (
                <p className="mt-4 text-sm text-neutral-500">
                  {t(
                    'organizationReadOnly',
                    '部门、岗位及角色由企业管理员或被授权人员维护。',
                  )}
                </p>
              )}
            </Card>
            <Card title={t('quickLinks', '常用入口')}>
              <Space wrap>
                <Button onClick={() => history.push('/account/settings')}>
                  {t('settings', '个人设置')}
                </Button>
                {allowedPaths.includes('/message-center/inbox') && (
                  <Button onClick={() => history.push('/message-center/inbox')}>
                    {t('messages', '我的消息')}
                  </Button>
                )}
                {allowedPaths.includes('/files') && (
                  <Button onClick={() => history.push('/files')}>
                    {t('files', '文件管理')}
                  </Button>
                )}
              </Space>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
