import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  Tag,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  createBroker,
  deleteBroker,
  getCredentialMetadata,
  listBrokers,
  revealCredential,
  rotateCredential,
  setDefaultBroker,
  type TenantCredentialMetadata,
  type TenantMqttBroker,
  testBroker,
  updateBroker,
} from './service';

interface Revealed {
  username: string;
  password: string;
  host: string;
  port: number;
  topicPrefix: string;
}

export default function TenantMqtt() {
  const { t, run, load, report } = useManagement();
  const table = useRef<ActionType | null>(null);
  const [metadata, setMetadata] = useState<TenantCredentialMetadata | null>();
  const [editing, setEditing] = useState<TenantMqttBroker | null>();
  const [verifying, setVerifying] = useState<'reveal' | 'rotate'>();
  const [revealed, setRevealed] = useState<Revealed>();

  const loadMetadata = async () => {
    const result = await getCredentialMetadata();
    setMetadata(result.data ?? null);
  };

  useEffect(() => {
    loadMetadata().catch(report);
  }, []);

  const columns: ProColumns<TenantMqttBroker>[] = [
    { title: t('name', '名称'), dataIndex: 'name', search: false },
    {
      title: t('address', '地址'),
      search: false,
      render: (_, row) =>
        `${row.useTls ? 'mqtts' : 'mqtt'}://${row.host}:${row.port}`,
    },
    {
      title: t('protocol', '协议'),
      dataIndex: 'protocolVersion',
      search: false,
    },
    {
      title: t('default', '默认'),
      search: false,
      render: (_, row) => (row.isDefault ? <Tag color="blue">是</Tag> : '-'),
    },
    {
      title: t('status', '状态'),
      search: false,
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
        <Button key="edit" type="link" onClick={() => setEditing(row)}>
          {t('edit', '编辑')}
        </Button>,
        <Button
          key="test"
          type="link"
          onClick={() =>
            run(
              () => testBroker(row.id),
              () => undefined,
            )
          }
        >
          {t('test', '测试')}
        </Button>,
        !row.isDefault && (
          <Button
            key="default"
            type="link"
            onClick={() =>
              run(
                () => setDefaultBroker(row.id),
                () => table.current?.reload(),
              )
            }
          >
            {t('setDefault', '设为默认')}
          </Button>
        ),
        <Popconfirm
          key="delete"
          title={t('confirmDelete', '确定删除该 Broker？')}
          onConfirm={() =>
            run(
              () => deleteBroker(row.id),
              () => table.current?.reload(),
            )
          }
        >
          <Button type="link" danger>
            {t('delete', '删除')}
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      title={t('mqttConfig', 'MQTT 配置')}
      content={t(
        'tenantMqttConfigHelp',
        '查看平台提供的 Broker 凭据，或维护本租户自己的 MQTT Broker。',
      )}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          title={t('platformCredential', '平台 Broker 凭据')}
          extra={
            <Space>
              <Button
                disabled={!metadata || metadata.status === 'missing'}
                onClick={() => setVerifying('reveal')}
              >
                {t('viewCredential', '查看凭据')}
              </Button>
              <Button
                disabled={!metadata || metadata.status === 'missing'}
                onClick={() => setVerifying('rotate')}
              >
                {t('rotateCredential', '轮换密码')}
              </Button>
            </Space>
          }
        >
          {metadata === undefined ? null : metadata === null ? (
            <Alert
              type="warning"
              showIcon
              title={t('platformBrokerMissing', '平台尚未配置 MQTT Broker')}
            />
          ) : (
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t('host', 'Host')}>
                {metadata.platform.host}:{metadata.platform.port}
              </Descriptions.Item>
              <Descriptions.Item label={t('protocol', '协议')}>
                {metadata.platform.protocols.join(' / ')}
              </Descriptions.Item>
              <Descriptions.Item label={t('username', '用户名')}>
                {metadata.username || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('status', '状态')}>
                <Tag
                  color={
                    metadata.status === 'provisioned'
                      ? 'green'
                      : metadata.status === 'failed'
                        ? 'red'
                        : 'default'
                  }
                >
                  {metadata.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('topicPrefix', 'Topic 前缀')}>
                {metadata.topicPrefix || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('lastError', '最近错误')}>
                {metadata.lastError || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <ProTable<TenantMqttBroker>
          headerTitle={t('ownBrokers', '自有 Broker')}
          rowKey="id"
          actionRef={table}
          columns={columns}
          search={false}
          pagination={false}
          request={() =>
            load(async () => {
              const result = await listBrokers();
              return {
                success: true,
                data: result.data,
                total: result.data.length,
              };
            })
          }
          toolBarRender={() => [
            <Button key="new" type="primary" onClick={() => setEditing(null)}>
              {t('addBroker', '新增 Broker')}
            </Button>,
          ]}
        />
      </Space>

      {verifying && (
        <ModalForm<{ password: string }>
          open
          title={
            verifying === 'reveal'
              ? t('viewCredential', '查看凭据')
              : t('rotateCredential', '轮换密码')
          }
          onOpenChange={(open) => {
            if (!open) setVerifying(undefined);
          }}
          onFinish={(values) =>
            run(
              async () => {
                const result =
                  verifying === 'reveal'
                    ? await revealCredential(values)
                    : await rotateCredential(values);
                setRevealed(result.data);
              },
              () => setVerifying(undefined),
            )
          }
        >
          <ProFormText.Password
            name="password"
            label={t('loginPassword', '当前登录密码')}
            rules={[{ required: true }]}
          />
        </ModalForm>
      )}

      {editing !== undefined && (
        <ModalForm<BackendAPI.CreateTenantMqttBrokerDto & { revision?: number }>
          open
          title={
            editing
              ? t('editBroker', '编辑 Broker')
              : t('addBroker', '新增 Broker')
          }
          initialValues={
            editing
              ? {
                  ...editing,
                  password: '',
                  revision: editing.revision,
                }
              : {
                  port: 1883,
                  useTls: false,
                  protocolVersion: '3.1.1',
                  subscribeFilter: '#',
                  keepaliveSeconds: 60,
                  cleanStart: false,
                  sessionExpirySeconds: 86400,
                  defaultQos: 1,
                  isActive: true,
                }
          }
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updateBroker(editing.id, {
                      ...values,
                      revision: editing.revision,
                      password: values.password || undefined,
                    })
                  : createBroker({
                      ...values,
                      password: values.password || undefined,
                    }),
              () => {
                setEditing(undefined);
                table.current?.reload();
              },
            )
          }
        >
          <ProFormText
            name="name"
            label={t('name', '名称')}
            rules={[{ required: true }, { max: 100 }]}
          />
          <ProFormText
            name="host"
            label="Host"
            rules={[{ required: true }, { max: 255 }]}
          />
          <ProFormDigit
            name="port"
            label="Port"
            min={1}
            max={65535}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="useTls" label={t('useTls', '使用 TLS')} />
          <ProFormSelect
            name="protocolVersion"
            label={t('protocol', '协议')}
            options={[
              { value: '3.1.1', label: 'MQTT 3.1.1' },
              { value: '5', label: 'MQTT 5' },
            ]}
            rules={[{ required: true }]}
          />
          <ProFormText name="username" label={t('username', '用户名')} />
          <ProFormText.Password
            name="password"
            label={t('password', '密码')}
            placeholder={editing ? '留空保持不变' : undefined}
          />
          <ProFormText
            name="clientIdPrefix"
            label={t('clientIdPrefix', 'Client ID 前缀')}
          />
          <ProFormText
            name="subscribeFilter"
            label={t('subscribeFilter', '订阅 Filter')}
          />
          <ProFormDigit
            name="keepaliveSeconds"
            label={t('keepalive', 'Keepalive 秒')}
            min={10}
            max={3600}
            fieldProps={{ precision: 0 }}
          />
          <ProFormSwitch name="cleanStart" label="Clean Start" />
          <ProFormDigit
            name="sessionExpirySeconds"
            label={t('sessionExpiry', '会话有效期（秒）')}
            min={0}
            max={604800}
            fieldProps={{ precision: 0 }}
          />
          <ProFormSelect
            name="defaultQos"
            label={t('defaultQos', '默认 QoS')}
            options={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
              { value: 2, label: '2' },
            ]}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}

      <Modal
        open={revealed !== undefined}
        title={t('credentialResult', '凭据信息')}
        onCancel={() => setRevealed(undefined)}
        footer={<Button onClick={() => setRevealed(undefined)}>关闭</Button>}
      >
        {revealed && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Username">
              {revealed.username}
            </Descriptions.Item>
            <Descriptions.Item label="Password">
              <code>{revealed.password}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Host">
              {revealed.host}:{revealed.port}
            </Descriptions.Item>
            <Descriptions.Item label="Topic">
              {revealed.topicPrefix}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
