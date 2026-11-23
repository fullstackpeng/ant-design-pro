import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Tabs } from 'antd';
import React from 'react';
import { useAccountProfile } from '../useAccountProfile';
import BaseView from './components/base';
import SecurityView from './components/security';

export default function Settings() {
  const {
    data: profile,
    isPending,
    isError,
    refetch,
    refresh,
    report,
    t,
  } = useAccountProfile();
  return (
    <PageContainer title={t('settings', '个人设置')}>
      <Alert
        className="mb-6"
        type="info"
        showIcon
        title={t(
          'globalAccountHint',
          '基本资料与密码属于账号，在所有企业中共用。',
        )}
      />
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
        <Card loading={isPending}>
          {profile && (
            <Tabs
              items={[
                {
                  key: 'base',
                  label: t('basic', '基本资料'),
                  children: (
                    <BaseView
                      profile={profile}
                      refresh={refresh}
                      report={report}
                      t={t}
                    />
                  ),
                },
                {
                  key: 'security',
                  label: t('security', '安全设置'),
                  children: <SecurityView report={report} t={t} />,
                },
              ]}
            />
          )}
        </Card>
      )}
    </PageContainer>
  );
}
