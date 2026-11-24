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
import { Alert, Button, Popconfirm } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useManagement } from '../../useManagement';
import {
  type Assistant,
  create,
  getOptions,
  knowledgeBases,
  list,
  remove,
  tenantOptions,
  update,
} from './service';

type FormValues = Omit<
  BackendAPI.CreateAiAssistantDto,
  'prompt' | 'retrievalConfig'
> & { exact: boolean; keyword: boolean; trigram: boolean; topK: number };

export default function Assistants() {
  const { t, run, load, report, pending } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Assistant | null>();
  const [options, setOptions] = useState<BackendAPI.AiOptionsDto>({
    permissions: [],
    pages: [],
  });
  useEffect(() => {
    getOptions()
      .then((r) => setOptions(r.data))
      .catch(report);
  }, [report]);
  const reload = () => {
    action.current?.reload();
  };
  const columns: ProColumns<Assistant>[] = [
    { title: t('code', '编码'), dataIndex: 'code' },
    { title: t('name', '名称'), dataIndex: 'name' },
    {
      title: t('aiPublicationScope', '发布范围'),
      dataIndex: 'publicationScope',
      valueEnum: {
        none: t('aiUnpublished', '未发布'),
        all: t('aiAllTenants', '全部租户'),
        selected: t('aiSelectedTenants', '指定租户'),
      },
    },
    { title: t('enabled', '启用'), dataIndex: 'isActive', valueType: 'switch' },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, r) => [
        <Button key="edit" type="link" onClick={() => setEditing(r)}>
          {t('edit', '编辑')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t('aiDeleteAssistant', '已有会话的助手请停用；确认删除？')}
          onConfirm={() => run(() => remove(r.id), reload)}
        >
          <Button type="link" danger>
            {t('delete', '删除')}
          </Button>
        </Popconfirm>,
      ],
    },
  ];
  return (
    <PageContainer title={t('aiAssistants', 'AI 助手配置')}>
      <ProTable<Assistant>
        rowKey="id"
        actionRef={action}
        columns={columns}
        search={false}
        request={(params) => load(() => list(params))}
        toolBarRender={() => [
          <Button key="create" type="primary" onClick={() => setEditing(null)}>
            {t('create', '新增')}
          </Button>,
        ]}
      />
      {editing !== undefined && (
        <ModalForm<FormValues>
          open
          title={t('aiAssistant', '助手配置')}
          initialValues={
            editing
              ? { ...editing, ...editing.retrievalConfig }
              : {
                  isActive: false,
                  isPublic: false,
                  permissionMode: 'ALL',
                  permissions: [],
                  publicationScope: 'none',
                  tenantIds: [],
                  knowledgeBaseIds: [],
                  exact: true,
                  keyword: true,
                  trigram: false,
                  topK: 4,
                }
          }
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          submitter={{ submitButtonProps: { loading: pending } }}
          onFinish={(values) => {
            const { exact, keyword, trigram, topK, ...fields } = values;
            const body: BackendAPI.CreateAiAssistantDto = {
              ...fields,
              prompt: editing?.prompt ?? '',
              permissions: fields.permissions ?? [],
              tenantIds:
                fields.publicationScope === 'selected'
                  ? (fields.tenantIds ?? [])
                  : [],
              knowledgeBaseIds: fields.knowledgeBaseIds ?? [],
              retrievalConfig: {
                exact,
                keyword,
                trigram: keyword && trigram,
                vector: false,
                topK,
              },
            };
            return run(
              () =>
                editing
                  ? update(editing.id, { ...body, revision: editing.revision })
                  : create(body),
              () => {
                setEditing(undefined);
                reload();
              },
            );
          }}
        >
          <Alert
            type="info"
            title={t(
              'aiAssistantHelp',
              '启用并发布后，授权租户才能使用；文档仍按用户实际业务权限过滤。',
            )}
          />
          <ProFormText
            name="code"
            label={t('code', '编码')}
            rules={[{ required: true, pattern: /^[a-z][a-z0-9-]{0,63}$/ }]}
          />
          <ProFormText
            name="name"
            label={t('name', '名称')}
            rules={[{ required: true, max: 100 }]}
          />
          <ProFormSelect
            name="knowledgeBaseIds"
            label={t('aiKnowledgeBases', '知识库')}
            mode="multiple"
            request={knowledgeBases}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
          <ProFormSelect
            name="publicationScope"
            label={t('aiPublicationScope', '发布范围')}
            options={[
              { value: 'none', label: t('aiUnpublished', '未发布') },
              { value: 'all', label: t('aiAllTenants', '全部租户') },
              { value: 'selected', label: t('aiSelectedTenants', '指定租户') },
            ]}
            rules={[{ required: true }]}
          />
          <ProFormDependency name={['publicationScope']}>
            {({ publicationScope }) =>
              publicationScope === 'selected' && (
                <ProFormSelect
                  name="tenantIds"
                  label={t('aiTenants', '租户')}
                  mode="multiple"
                  showSearch
                  request={tenantOptions}
                  rules={[{ required: true }]}
                />
              )
            }
          </ProFormDependency>
          <ProFormSwitch
            name="isPublic"
            label={t('aiPublicAssistant', '向发布范围内有问答权限的用户开放')}
          />
          <ProFormSelect
            name="permissionMode"
            label={t('aiPermissionMode', '权限组合')}
            options={[
              { value: 'ALL', label: t('aiAllPermissions', '全部满足') },
              { value: 'ANY', label: t('aiAnyPermission', '任一满足') },
            ]}
          />
          <ProFormSelect
            name="permissions"
            label={t('aiAssistantPermissions', '助手访问权限')}
            mode="multiple"
            options={options.permissions}
            fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          />
          <ProFormSwitch
            name="exact"
            label={t('aiExact', '标准问题精确匹配')}
          />
          <ProFormSwitch
            name="keyword"
            label={t('aiKeyword', '中文关键词与同义词检索')}
          />
          <ProFormDependency name={['keyword']}>
            {({ keyword }) =>
              keyword && (
                <ProFormSwitch
                  name="trigram"
                  label={t('aiFuzzy', '允许模糊问题匹配')}
                />
              )
            }
          </ProFormDependency>
          <ProFormDigit
            name="topK"
            label={t('aiTopK', '最多展示指南数')}
            min={1}
            max={10}
            rules={[{ required: true }]}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
