import {
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProTable,
} from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import { Alert, App, Button, Descriptions, Drawer, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  type AuditLog,
  type AuditPolicy,
  getAuditLog,
  getAuditPolicy,
  listAuditLogs,
  updateAuditPolicy,
} from './service';

export default function AuditLogs() {
  const { pathname } = useLocation();
  const scope = pathname.startsWith('/platform/') ? 'platform' : 'tenant';
  const kind = pathname.replace(/\/+$/, '').endsWith('/login-logs')
    ? 'login'
    : 'operation';
  const { t, load, run, report } = useManagement();
  const { modal } = App.useApp();
  const [policy, setPolicy] = useState<AuditPolicy>();
  const [editing, setEditing] = useState<AuditPolicy>();
  const [detail, setDetail] = useState<AuditLog>();
  const [detailId, setDetailId] = useState<string>();
  const [detailError, setDetailError] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [openingPolicy, setOpeningPolicy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPolicy(undefined);
    setPolicyError(false);
    setEditing(undefined);
    setDetail(undefined);
    setDetailId(undefined);
    void getAuditPolicy(scope)
      .then(({ data }) => {
        if (!cancelled) setPolicy(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setPolicyError(true);
          report(error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, kind]);

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    setDetail(undefined);
    setDetailError(false);
    void getAuditLog(scope, kind, detailId)
      .then(({ data }) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetailError(true);
          report(error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, kind, detailId]);

  const results = {
    succeeded: { text: t('auditSucceeded', '成功'), status: 'Success' },
    failed: { text: t('auditFailed', '失败'), status: 'Error' },
    denied: { text: t('auditDenied', '拒绝'), status: 'Warning' },
    accepted: {
      text: t('auditAccepted', '已受理／已提交'),
      status: 'Processing',
    },
  };
  const modules = Object.fromEntries(
    Object.entries({
      auth: '登录认证',
      account: '个人账户',
      users: '用户管理',
      tenants: '租户管理',
      plans: '套餐管理',
      subscriptions: '订阅管理',
      settings: '系统配置',
      menus: '菜单管理',
      features: '功能分配',
      members: '成员管理',
      roles: '角色权限',
      departments: '部门管理',
      positions: '岗位管理',
      dictionaries: '租户字典',
      'platform-dictionaries': '平台字典',
      storage: '存储服务商',
      files: '租户文件',
      'platform-files': '平台文件',
      'site-assets': '站点资源',
      'notification-assets': '通知图片',
      notifications: '租户通知',
      'platform-notifications': '平台通知',
      inbox: '消息中心',
      'mqtt-platform': '平台 MQTT',
      'mqtt-brokers': '租户 Broker',
      'mqtt-platform-brokers': '平台 Broker 管理',
      'mqtt-credentials': 'MQTT 凭据',
      'mqtt-messages': 'MQTT 消息',
      'mqtt-admin': 'MQTT 运维',
      tasks: '定时任务',
      realtime: '实时操作',
      audit: '审计管理',
    }).map(([code, name]) => [code, t(`auditModule.${code}`, name)]),
  );
  const columns: ProColumns<AuditLog>[] = [
    {
      title: t('auditTime', '时间'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 180,
    },
    {
      title: t('auditTimeRange', '时间范围'),
      dataIndex: 'period',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value: string[]) => ({
          startAt: value[0],
          endAt: value[1],
        }),
      },
    },
    {
      title: t('auditActor', '操作人'),
      dataIndex: 'actorName',
      render: (_, row) => row.actorName || t('auditUnauthenticated', '未认证'),
    },
    {
      title: t('auditAttemptedAccount', '登录账号'),
      dataIndex: 'attemptedAccount',
      hideInTable: kind !== 'login',
      search: kind === 'login' ? undefined : false,
    },
    {
      title: t('auditTenant', '所属租户'),
      dataIndex: 'tenantName',
      hideInTable: scope !== 'platform',
      search: false,
      render: (_, row) =>
        row.tenantName ||
        (row.scope === 'platform'
          ? t('auditPlatform', '平台')
          : t('auditSystem', '系统')),
    },
    {
      title: t('auditTenantId', '租户 ID'),
      dataIndex: 'tenantId',
      hideInTable: true,
      search: scope === 'platform' ? undefined : false,
    },
    {
      title: t('auditAttemptedTenant', '尝试登录租户'),
      dataIndex: 'attemptedTenant',
      hideInTable: kind !== 'login',
      search: kind === 'login' ? undefined : false,
    },
    {
      title: t('auditModule', '业务模块'),
      dataIndex: 'module',
      valueType: 'select',
      valueEnum: modules,
      hideInTable: kind === 'login',
      search: kind === 'login' ? false : undefined,
    },
    {
      title: t('auditAction', '操作'),
      dataIndex: 'action',
      search: false,
    },
    {
      title: t('auditEventCode', '事件编码'),
      dataIndex: 'eventCode',
      hideInTable: true,
    },
    {
      title: t('auditTarget', '操作对象'),
      dataIndex: 'targetName',
      hideInTable: kind === 'login',
      search: false,
      render: (_, row) => row.targetName || row.targetId || '—',
    },
    {
      title: t('auditResult', '结果'),
      dataIndex: 'result',
      valueType: 'select',
      valueEnum: results,
      render: (_, row) => (
        <Tag
          color={
            row.result === 'succeeded'
              ? 'green'
              : row.result === 'accepted'
                ? 'blue'
                : 'red'
          }
        >
          {results[row.result as keyof typeof results]?.text ?? row.result}
        </Tag>
      ),
    },
    { title: 'IP', dataIndex: 'ip' },
    {
      title: t('auditRequestId', '请求标识'),
      dataIndex: 'requestId',
      hideInTable: true,
    },
    {
      title: t('auditMessage', '说明'),
      dataIndex: 'message',
      search: false,
      ellipsis: true,
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => (
        <Button type="link" onClick={() => setDetailId(row.id)}>
          {t('auditDetail', '详情')}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title={
        kind === 'login'
          ? t('auditLoginLogs', '登录日志')
          : t('auditOperationLogs', '操作日志')
      }
    >
      <Alert
        className="mb-4"
        type={policyError ? 'error' : 'info'}
        showIcon
        title={
          policy
            ? `${t('auditRetention', '保留天数')}：${kind === 'login' ? policy.loginDays : policy.operationDays}；${t('auditRetentionHelp', '到期日志自动清理，延长保留时间无法恢复已删除记录。')}`
            : policyError
              ? t('auditPolicyFailed', '保留策略读取失败，请刷新重试。')
              : t('auditRetentionLoading', '正在读取日志保留策略…')
        }
      />
      <ProTable<AuditLog>
        key={`${scope}-${kind}`}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1400 }}
        search={{ defaultCollapsed: true }}
        request={(params) => load(() => listAuditLogs(scope, kind, params))}
        toolBarRender={() =>
          scope === 'platform'
            ? [
                <Button
                  key="policy"
                  loading={openingPolicy}
                  onClick={async () => {
                    setOpeningPolicy(true);
                    try {
                      const { data } = await getAuditPolicy(scope);
                      setPolicy(data);
                      setEditing(data);
                      setPolicyError(false);
                    } catch (error) {
                      report(error);
                    } finally {
                      setOpeningPolicy(false);
                    }
                  }}
                >
                  {t('auditRetentionSettings', '保留策略')}
                </Button>,
              ]
            : []
        }
      />
      <Drawer
        open={!!detailId}
        onClose={() => setDetailId(undefined)}
        title={t('auditDetail', '日志详情')}
        size="large"
      >
        {detail ? (
          <>
            <Descriptions
              column={1}
              bordered
              items={[
                {
                  key: 'event',
                  label: t('auditEventCode', '事件编码'),
                  children: detail.eventCode,
                },
                {
                  key: 'time',
                  label: t('auditTime', '时间'),
                  children: new Date(detail.createdAt).toLocaleString(),
                },
                {
                  key: 'actor',
                  label: t('auditActor', '操作人'),
                  children: `${detail.actorName || '—'} (${detail.actorId || '—'})`,
                },
                {
                  key: 'tenant',
                  label: t('auditTenant', '所属租户'),
                  children: `${detail.tenantName || '—'} (${detail.tenantCode || detail.scope})`,
                },
                {
                  key: 'target',
                  label: t('auditTarget', '操作对象'),
                  children: `${detail.targetType} ${detail.targetName || detail.targetId || '—'}`,
                },
                {
                  key: 'targetTenant',
                  label: t('auditTargetTenant', '目标租户 ID'),
                  children: detail.targetTenantId || '—',
                },
                {
                  key: 'result',
                  label: t('auditResult', '结果'),
                  children:
                    results[detail.result as keyof typeof results]?.text ??
                    detail.result,
                },
                {
                  key: 'message',
                  label: t('auditMessage', '说明'),
                  children: detail.message || '—',
                },
                ...(kind === 'login'
                  ? [
                      {
                        key: 'attempt',
                        label: t('auditLoginAttempt', '登录尝试'),
                        children: `${detail.attemptedAccount || '—'} / ${detail.attemptedTenant || '—'}`,
                      },
                    ]
                  : []),
                { key: 'ip', label: 'IP', children: detail.ip || '—' },
                {
                  key: 'client',
                  label: t('auditClient', '客户端'),
                  children: detail.userAgent || '—',
                },
                {
                  key: 'request',
                  label: t('auditRequestId', '请求标识'),
                  children: detail.requestId,
                },
              ]}
            />
            {detail.changes.length > 0 && (
              <div className="mt-4 space-y-4">
                {detail.changes.map((change) => (
                  <div
                    key={String(change.changeId)}
                    className="rounded border border-gray-200 p-3"
                  >
                    <div>
                      {String(change.entity ?? '')} ·{' '}
                      {String(change.operation ?? '')}
                    </div>
                    <div className="mt-2">{t('auditBefore', '变更前')}</div>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(change.before, null, 2)}
                    </pre>
                    <div>{t('auditAfter', '变更后')}</div>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(change.after, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            {detailError
              ? t('auditDetailFailed', '日志详情读取失败，请关闭后重试。')
              : t('auditDetailLoading', '正在读取日志详情…')}
          </div>
        )}
      </Drawer>
      {editing && (
        <ModalForm<AuditPolicy>
          title={t('auditRetentionSettings', '日志保留策略')}
          open
          initialValues={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onFinish={async (values) => {
            if (
              values.operationDays < editing.operationDays ||
              values.loginDays < editing.loginDays
            ) {
              const confirmed = await new Promise<boolean>((resolve) =>
                modal.confirm({
                  title: t('auditShortenConfirm', '确认缩短日志保留时间'),
                  content: `${t('auditOperationLogs', '操作日志')}：${editing.operationDays} → ${values.operationDays}；${t('auditLoginLogs', '登录日志')}：${editing.loginDays} → ${values.loginDays}。${t('auditShortenWarning', '超出新期限的日志将在自动清理时永久删除，无法恢复。')}`,
                  onOk: () => {
                    resolve(true);
                  },
                  onCancel: () => {
                    resolve(false);
                  },
                }),
              );
              if (!confirmed) return false;
            }
            return run(
              async () => {
                const { data } = await updateAuditPolicy({
                  ...values,
                  revision: editing.revision,
                });
                setPolicy(data);
              },
              () => setEditing(undefined),
            );
          }}
        >
          <ProFormDigit
            name="operationDays"
            label={t('auditOperationDays', '操作日志保留天数')}
            min={1}
            max={3650}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="loginDays"
            label={t('auditLoginDays', '登录日志保留天数')}
            min={1}
            max={3650}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <Alert
            type="warning"
            showIcon
            title={t(
              'auditPolicyHelp',
              '此策略适用于平台和全部租户，修改策略也会记录审计日志。',
            )}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
