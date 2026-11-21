import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProForm,
  ProFormDigit,
  type ProFormInstance,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  Tag,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  deleteTenantBroker,
  getPlatformBroker,
  listTenantBrokers,
  listTenantCredentials,
  type PlatformMqttBroker,
  provisionBridge,
  provisionTenant,
  reconnectBridge,
  revealTenant,
  rotateTenant,
  setDefaultTenantBroker,
  type TenantBroker,
  type TenantMqttCredentialRow,
  testPlatformBroker,
  testTenantBroker,
  updatePlatformBroker,
  updateTenantBroker,
} from './service';

interface BrokerForm {
  name: string;
  host: string;
  port: number;
  useTls: boolean;
  defaultProtocol: string;
  adminUsername: string;
  adminPassword?: string;
  bridgeUsername: string;
  bridgePassword?: string;
  responseTopic: string;
  commandTimeoutMs: number;
  isEnabled: boolean;
}

interface RevealedCredential {
  username: string;
  password: string;
  host: string;
  port: number;
  topicPrefix: string;
}

export default function PlatformMqtt() {
  const { t, run, load, report } = useManagement();
  const form = useRef<ProFormInstance<BrokerForm> | undefined>(undefined);
  const credentialTable = useRef<ActionType | null>(null);
  const brokerTable = useRef<ActionType | null>(null);
  const [broker, setBroker] = useState<PlatformMqttBroker | null>(null);
  const [editingBroker, setEditingBroker] = useState<TenantBroker | null>();
  const [verifying, setVerifying] = useState<{
    tenantId: string;
    mode: 'reveal' | 'rotate';
  }>();
  const [revealed, setRevealed] = useState<RevealedCredential>();

  const loadBroker = async () => {
    const result = await getPlatformBroker();
    setBroker(result.data ?? null);
    if (result.data)
      form.current?.setFieldsValue({
        ...result.data,
        adminPassword: '',
        bridgePassword: '',
      });
    return result;
  };

  useEffect(() => {
    loadBroker().catch(report);
  }, []);

  const credentialColumns: ProColumns<TenantMqttCredentialRow>[] = [
    { title: t('tenant', '租户'), dataIndex: 'tenantName', search: false },
    {
      title: t('tenantCode', '租户编码'),
      dataIndex: 'tenantCode',
      search: false,
    },
    { title: t('username', '用户名'), dataIndex: 'username', search: false },
    {
      title: t('status', '状态'),
      dataIndex: 'status',
      search: false,
      render: (_, row) => (
        <Tag
          color={
            row.status === 'provisioned'
              ? 'green'
              : row.status === 'failed'
                ? 'red'
                : 'default'
          }
        >
          {row.status}
        </Tag>
      ),
    },
    {
      title: t('lastError', '最近错误'),
      dataIndex: 'lastError',
      search: false,
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button
          key="provision"
          type="link"
          onClick={() =>
            run(
              () => provisionTenant(row.tenantId),
              () => credentialTable.current?.reload(),
            )
          }
        >
          {t('provision', '开通/重试')}
        </Button>,
        <Button
          key="reveal"
          type="link"
          disabled={row.status === 'missing'}
          onClick={() =>
            setVerifying({ tenantId: row.tenantId, mode: 'reveal' })
          }
        >
          {t('viewCredential', '查看凭据')}
        </Button>,
        <Button
          key="rotate"
          type="link"
          disabled={row.status === 'missing'}
          onClick={() =>
            setVerifying({ tenantId: row.tenantId, mode: 'rotate' })
          }
        >
          {t('rotateCredential', '轮换密码')}
        </Button>,
      ],
    },
  ];

  const tenantBrokerColumns: ProColumns<TenantBroker>[] = [
    {
      title: t('tenant', '租户'),
      search: false,
      render: (_, row) => `${row.tenantName ?? ''} (${row.tenantCode ?? ''})`,
    },
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
        <Button key="edit" type="link" onClick={() => setEditingBroker(row)}>
          {t('edit', '编辑')}
        </Button>,
        <Button
          key="test"
          type="link"
          onClick={() =>
            run(
              () => testTenantBroker(row.id),
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
                () => setDefaultTenantBroker(row.id),
                () => brokerTable.current?.reload(),
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
              () => deleteTenantBroker(row.id),
              () => brokerTable.current?.reload(),
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

  const brokerSubmit = (values: BrokerForm) =>
    run(
      () =>
        updatePlatformBroker({
          ...values,
          defaultProtocol: values.defaultProtocol as '3.1.1' | '5',
          adminPassword: values.adminPassword || undefined,
          bridgePassword: values.bridgePassword || undefined,
          revision: broker?.revision ?? 0,
        }),
      async () => {
        await loadBroker();
      },
    );

  return (
    <PageContainer
      title={t('mqttConfig', 'MQTT 配置')}
      content={t(
        'mqttConfigHelp',
        '平台 Broker 全局唯一。保存后需初始化 Bridge 账号并重连；租户凭据由平台自动开通。',
      )}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type={broker ? 'info' : 'warning'}
          showIcon
          title={
            broker
              ? `平台 Broker：${broker.host}:${broker.port}（${broker.defaultProtocol}）`
              : '尚未配置平台 Broker'
          }
        />
        <ProForm<BrokerForm>
          formRef={form}
          initialValues={{
            port: 1883,
            useTls: false,
            defaultProtocol: '3.1.1',
            responseTopic: '$CONTROL/dynamic-security/v1/response',
            commandTimeoutMs: 10000,
            isEnabled: true,
          }}
          submitter={{
            searchConfig: { submitText: t('save', '保存') },
            resetButtonProps: false,
          }}
          onFinish={brokerSubmit}
        >
          <ProFormText
            name="name"
            label={t('name', '名称')}
            rules={[{ required: true }, { max: 100 }]}
          />
          <ProFormText
            name="host"
            label={t('host', 'Host')}
            rules={[{ required: true }, { max: 255 }]}
          />
          <ProFormDigit
            name="port"
            label={t('port', 'Port')}
            min={1}
            max={65535}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="useTls" label={t('useTls', '使用 TLS')} />
          <ProFormSelect
            name="defaultProtocol"
            label={t('protocol', '协议')}
            options={[
              { value: '3.1.1', label: 'MQTT 3.1.1' },
              { value: '5', label: 'MQTT 5' },
            ]}
            rules={[{ required: true }]}
          />
          <ProFormText
            name="adminUsername"
            label={t('adminUsername', '管理账号')}
            rules={[{ required: true }]}
          />
          <ProFormText.Password
            name="adminPassword"
            label={t('adminPassword', '管理密码')}
            placeholder={broker ? '留空保持不变' : undefined}
            rules={broker ? [] : [{ required: true }]}
          />
          <ProFormText
            name="bridgeUsername"
            label={t('bridgeUsername', 'Bridge 账号')}
            rules={[{ required: true }]}
          />
          <ProFormText.Password
            name="bridgePassword"
            label={t('bridgePassword', 'Bridge 密码')}
            placeholder={broker ? '留空保持不变' : undefined}
            rules={broker ? [] : [{ required: true }]}
          />
          <ProFormText
            name="responseTopic"
            label={t('responseTopic', '管理响应 Topic')}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="commandTimeoutMs"
            label={t('commandTimeout', '管理命令超时 (ms)')}
            min={1000}
            max={60000}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="isEnabled" label={t('enabled', '启用')} />
        </ProForm>
        <Space wrap>
          <Button
            onClick={() =>
              run(
                () => testPlatformBroker(),
                () => undefined,
              )
            }
          >
            {t('testAdminConnection', '测试管理连接')}
          </Button>
          <Button
            onClick={() =>
              run(
                () => provisionBridge(),
                () => undefined,
              )
            }
          >
            {t('provisionBridge', '初始化 Bridge 账号')}
          </Button>
          <Button
            onClick={() =>
              run(
                () => reconnectBridge(),
                () => undefined,
              )
            }
          >
            {t('reconnectBridge', '重连 Bridge')}
          </Button>
        </Space>

        <ProTable<TenantMqttCredentialRow>
          headerTitle={t('tenantCredentials', '租户凭据')}
          rowKey="tenantId"
          actionRef={credentialTable}
          columns={credentialColumns}
          search={false}
          pagination={false}
          request={() =>
            load(async () => {
              const result = await listTenantCredentials();
              return {
                success: true,
                data: result.data,
                total: result.data.length,
              };
            })
          }
        />

        <ProTable<TenantBroker>
          headerTitle={t('tenantBrokers', '租户自建 Broker')}
          rowKey="id"
          actionRef={brokerTable}
          columns={tenantBrokerColumns}
          search={false}
          pagination={false}
          request={() => load(() => listTenantBrokers())}
        />
      </Space>

      {verifying && (
        <ModalForm<{ password: string }>
          open
          title={
            verifying.mode === 'reveal'
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
                  verifying.mode === 'reveal'
                    ? await revealTenant(verifying.tenantId, values)
                    : await rotateTenant(verifying.tenantId, values);
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

      {editingBroker && (
        <ModalForm<BackendAPI.UpdateTenantMqttBrokerDto>
          open
          title={t('editTenantBroker', '编辑租户 Broker')}
          initialValues={{
            ...editingBroker,
            password: '',
            revision: editingBroker.revision,
          }}
          onOpenChange={(open) => {
            if (!open) setEditingBroker(undefined);
          }}
          onFinish={(values) =>
            run(
              () =>
                updateTenantBroker(editingBroker.id, {
                  ...values,
                  password: values.password || undefined,
                }),
              () => {
                setEditingBroker(undefined);
                brokerTable.current?.reload();
              },
            )
          }
        >
          <ProFormText
            name="name"
            label={t('name', '名称')}
            rules={[{ required: true }]}
          />
          <ProFormText name="host" label="Host" rules={[{ required: true }]} />
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
            placeholder="留空保持不变"
          />
          <ProFormText
            name="subscribeFilter"
            label={t('subscribeFilter', '订阅 Filter')}
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
