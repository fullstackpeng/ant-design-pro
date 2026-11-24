import {
  PageContainer,
  ProForm,
  ProFormDigit,
} from '@ant-design/pro-components';
import { Alert, App, Card } from 'antd';
import React, { useEffect, useState } from 'react';
import { useManagement } from '../../useManagement';
import { getPolicy, updatePolicy } from './service';

export default function AiPolicy() {
  const { t, run, report, pending } = useManagement();
  const { modal } = App.useApp();
  const [policy, setPolicy] = useState<BackendAPI.AiPolicyDto>();
  const refresh = () => {
    getPolicy()
      .then((r) => setPolicy(r.data))
      .catch(report);
  };
  useEffect(refresh, []);
  return (
    <PageContainer title={t('aiRetention', 'AI 会话保留')}>
      <Card loading={!policy}>
        <Alert
          type="warning"
          title={t(
            'aiRetentionHelp',
            '按最后问答时间计算，过期会话及全部消息将自动删除。缩短期限可能删除已有会话，延长期限无法恢复已删除数据。',
          )}
        />
        {policy && (
          <ProForm<{ conversationRetentionDays: number }>
            key={policy.revision}
            initialValues={policy}
            submitter={{ submitButtonProps: { loading: pending } }}
            onFinish={async (values) => {
              if (
                values.conversationRetentionDays <
                policy.conversationRetentionDays
              ) {
                const confirmed = await new Promise<boolean>((resolve) => {
                  modal.confirm({
                    title: t('aiShortenRetention', '确认缩短保留期限？'),
                    content: t(
                      'aiShortenRetentionHelp',
                      '超出新期限的会话会立即停止访问，并由清理任务永久删除。',
                    ),
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                  });
                });
                if (!confirmed) return false;
              }
              return run(
                () => updatePolicy({ ...values, revision: policy.revision }),
                refresh,
              );
            }}
          >
            <ProFormDigit
              name="conversationRetentionDays"
              label={t('aiRetentionDays', '会话保留天数')}
              min={1}
              max={3650}
              fieldProps={{ precision: 0 }}
              rules={[{ required: true }]}
            />
          </ProForm>
        )}
      </Card>
    </PageContainer>
  );
}
