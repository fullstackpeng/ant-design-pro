import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Select, Space, Tag, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { listTenantCredentials } from '../platform-mqtt/service';
import { useManagement } from '../useManagement';
import { cleanupMessages, listMessages, type MqttMessage } from './service';

export default function MqttMessages() {
  const { t, run, load, report } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [tenants, setTenants] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [cleanupTenant, setCleanupTenant] = useState<string>();

  useEffect(() => {
    listTenantCredentials()
      .then((result) =>
        setTenants(
          result.data.map((row) => ({
            value: row.tenantId,
            label: `${row.tenantName} (${row.tenantCode})`,
          })),
        ),
      )
      .catch(report);
  }, []);

  const columns: ProColumns<MqttMessage>[] = [
    {
      title: t('tenant', '租户'),
      dataIndex: 'tenantId',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: tenants,
        placeholder: t('tenant', '租户'),
      },
    },
    {
      title: t('direction', '方向'),
      dataIndex: 'direction',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: [
          { value: 'inbound', label: 'inbound' },
          { value: 'outbound', label: 'outbound' },
        ],
      },
    },
    {
      title: 'Topic',
      dataIndex: 'topic',
      hideInTable: true,
    },
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 80,
    },
    {
      title: t('tenant', '租户'),
      search: false,
      render: (_, row) => `${row.tenantName} (${row.tenantCode})`,
    },
    {
      title: 'Topic',
      dataIndex: 'topic',
      search: false,
      ellipsis: true,
    },
    {
      title: t('direction', '方向'),
      dataIndex: 'direction',
      search: false,
      render: (_, row) => (
        <Tag color={row.direction === 'inbound' ? 'blue' : 'green'}>
          {row.direction}
        </Tag>
      ),
    },
    {
      title: 'QoS',
      dataIndex: 'qos',
      search: false,
      width: 70,
    },
    {
      title: 'Retain',
      dataIndex: 'retain',
      search: false,
      width: 80,
      render: (_, row) => (row.retain ? '是' : '-'),
    },
    {
      title: 'Payload',
      dataIndex: 'payload',
      search: false,
      ellipsis: true,
      render: (_, row) => (
        <Tooltip title={row.payload}>
          <span>{row.payload}</span>
        </Tooltip>
      ),
    },
    {
      title: t('createdAt', '时间'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
  ];

  return (
    <PageContainer
      title={t('mqttMessages', 'MQTT 消息')}
      content={t(
        'mqttMessagesHelp',
        '消息默认永久保留，可按租户或全部清理；清理操作会写入审计。',
      )}
    >
      <ProTable<MqttMessage>
        rowKey="id"
        actionRef={action}
        columns={columns}
        request={(params) => load(() => listMessages(params))}
        toolBarRender={() => [
          <Space key="cleanup" wrap>
            <Select
              allowClear
              style={{ width: 260 }}
              placeholder={t('selectTenant', '选择租户')}
              options={tenants}
              value={cleanupTenant}
              onChange={setCleanupTenant}
            />
            <Popconfirm
              title={t(
                'confirmCleanupTenant',
                '确定清理所选租户的全部 MQTT 消息？',
              )}
              disabled={!cleanupTenant}
              onConfirm={() =>
                run(
                  () => cleanupMessages({ tenantId: cleanupTenant }),
                  () => action.current?.reload(),
                )
              }
            >
              <Button danger disabled={!cleanupTenant}>
                {t('cleanupTenant', '按租户清理')}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t('confirmCleanupAll', '确定清理全部 MQTT 消息？')}
              onConfirm={() =>
                run(
                  () => cleanupMessages({}),
                  () => action.current?.reload(),
                )
              }
            >
              <Button danger>{t('cleanupAll', '全部清理')}</Button>
            </Popconfirm>
          </Space>,
        ]}
      />
    </PageContainer>
  );
}
