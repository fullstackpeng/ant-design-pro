import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDependency,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  createStorageProvider,
  listStorageProtocols,
  listStorageProviders,
  type StorageProtocol,
  type StorageProvider,
  setDefaultStorageProvider,
  testStorageProvider,
  updateStorageProvider,
} from './service';

interface ProviderForm {
  code: string;
  name: string;
  protocol: string;
  isActive: boolean;
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}

export default function StorageProviders() {
  const { t, run, load, report } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [protocols, setProtocols] = useState<StorageProtocol[]>([]);
  const [editing, setEditing] = useState<StorageProvider | null>();

  useEffect(() => {
    listStorageProtocols()
      .then((result) => setProtocols(result.data))
      .catch(report);
  }, []);

  const protocolLabel = (protocol: string) =>
    protocols.find((item) => item.protocol === protocol)?.label ?? protocol;

  const columns: ProColumns<StorageProvider>[] = [
    { title: t('code', '编码'), dataIndex: 'code', search: false },
    { title: t('name', '名称'), dataIndex: 'name', search: false },
    {
      title: t('protocol', '协议'),
      dataIndex: 'protocol',
      search: false,
      render: (_, row) => protocolLabel(row.protocol),
    },
    {
      title: t('defaultProvider', '默认'),
      dataIndex: 'isDefault',
      search: false,
      render: (_, row) =>
        row.isDefault ? <Tag color="blue">{t('yes', '是')}</Tag> : '-',
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
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="edit" type="link" onClick={() => setEditing(row)}>
          {t('edit', '编辑')}
        </Button>,
        !row.isDefault && (
          <Button
            key="default"
            type="link"
            onClick={() =>
              run(
                () => setDefaultStorageProvider(row.id),
                () => action.current?.reload(),
              )
            }
          >
            {t('setDefault', '设为默认')}
          </Button>
        ),
        <Button
          key="test"
          type="link"
          onClick={() =>
            run(
              () => testStorageProvider(row.id),
              () => undefined,
            )
          }
        >
          {t('testConnection', '测试连接')}
        </Button>,
      ],
    },
  ];

  const submit = (values: ProviderForm) => {
    const protocol = protocols.find(
      (item) => item.protocol === values.protocol,
    );
    const config = Object.fromEntries(
      (protocol?.configFields ?? [])
        .map((field) => [field.key, values.config?.[field.key]] as const)
        .filter(([, value]) => value !== undefined && value !== ''),
    ) as Record<string, unknown>;
    const secrets = Object.fromEntries(
      (protocol?.secretFields ?? [])
        .map((field) => [field.key, values.secrets?.[field.key]] as const)
        .filter(([, value]) => typeof value === 'string' && value !== ''),
    ) as Record<string, unknown>;
    if (editing) {
      return run(
        () =>
          updateStorageProvider(editing.id, {
            name: values.name,
            config,
            isActive: values.isActive,
            revision: editing.revision,
            ...(Object.keys(secrets).length ? { secrets } : {}),
          }),
        () => {
          setEditing(undefined);
          action.current?.reload();
        },
      );
    }
    return run(
      () =>
        createStorageProvider({
          code: values.code,
          name: values.name,
          protocol: values.protocol,
          config,
          secrets,
          isActive: values.isActive,
        }),
      () => {
        setEditing(undefined);
        action.current?.reload();
      },
    );
  };

  return (
    <PageContainer
      title={t('storageProviders', '存储服务商')}
      content={t(
        'storageProvidersHelp',
        '配置对象存储服务商，上传的文件统一使用默认服务商；密钥加密保存，页面不会回显。',
      )}
    >
      <ProTable<StorageProvider>
        rowKey="id"
        actionRef={action}
        columns={columns}
        search={false}
        pagination={false}
        request={() => load(() => listStorageProviders())}
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={() => setEditing(null)}>
            {t('createProvider', '新增服务商')}
          </Button>,
        ]}
      />
      {editing !== undefined && (
        <ModalForm<ProviderForm>
          open
          title={
            editing
              ? t('editProvider', '编辑服务商')
              : t('createProvider', '新增服务商')
          }
          initialValues={
            editing
              ? {
                  code: editing.code,
                  name: editing.name,
                  protocol: editing.protocol,
                  isActive: editing.isActive,
                  config: editing.config,
                  secrets: {},
                }
              : { isActive: true }
          }
          modalProps={{ destroyOnHidden: true }}
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onFinish={submit}
        >
          <ProFormText
            name="code"
            label={t('code', '编码')}
            disabled={!!editing}
            rules={[
              { required: true },
              { pattern: /^[a-z0-9][a-z0-9-]{0,63}$/ },
            ]}
          />
          <ProFormText
            name="name"
            label={t('name', '名称')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProFormSelect
            name="protocol"
            label={t('protocol', '协议')}
            disabled={!!editing}
            options={protocols.map((item) => ({
              value: item.protocol,
              label: item.label,
            }))}
            rules={[{ required: true }]}
          />
          <ProFormDependency name={['protocol']}>
            {({ protocol }) => {
              const meta = protocols.find((item) => item.protocol === protocol);
              if (!meta) return null;
              return (
                <>
                  {meta.configFields.map((field) =>
                    field.type === 'boolean' ? (
                      <ProFormSwitch
                        key={`config.${field.key}`}
                        name={['config', field.key]}
                        label={field.label}
                        initialValue={
                          editing
                            ? (editing.config?.[field.key] ??
                              field.default === true)
                            : field.default === true
                        }
                      />
                    ) : field.type === 'select' ? (
                      <ProFormSelect
                        key={`config.${field.key}`}
                        name={['config', field.key]}
                        label={field.label}
                        options={(field.options ?? []).map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        initialValue={
                          editing
                            ? (editing.config?.[field.key] ??
                              (typeof field.default === 'string'
                                ? field.default
                                : undefined))
                            : typeof field.default === 'string'
                              ? field.default
                              : undefined
                        }
                        rules={field.required ? [{ required: true }] : []}
                      />
                    ) : field.type === 'number' ? (
                      <ProFormDigit
                        key={`config.${field.key}`}
                        name={['config', field.key]}
                        label={field.label}
                        placeholder={field.placeholder}
                        initialValue={
                          editing
                            ? (editing.config?.[field.key] ?? field.default)
                            : field.default
                        }
                        rules={field.required ? [{ required: true }] : []}
                      />
                    ) : (
                      <ProFormText
                        key={`config.${field.key}`}
                        name={['config', field.key]}
                        label={field.label}
                        placeholder={field.placeholder}
                        initialValue={
                          editing
                            ? (editing.config?.[field.key] ?? field.default)
                            : field.default
                        }
                        rules={field.required ? [{ required: true }] : []}
                      />
                    ),
                  )}
                  {meta.secretFields.map((field) => (
                    <ProFormText.Password
                      key={`secrets.${field.key}`}
                      name={['secrets', field.key]}
                      label={field.label}
                      placeholder={
                        editing
                          ? t('secretKeep', '留空保持现有密钥')
                          : field.placeholder
                      }
                      extra={
                        editing?.secretKeys.includes(field.key)
                          ? t('secretConfigured', '已配置，留空保持不变')
                          : undefined
                      }
                      rules={
                        !editing && field.required ? [{ required: true }] : []
                      }
                    />
                  ))}
                </>
              );
            }}
          </ProFormDependency>
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </PageContainer>
  );
}
