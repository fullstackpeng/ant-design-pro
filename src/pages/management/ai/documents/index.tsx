import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Alert, Button, Popconfirm } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useManagement } from '../../useManagement';
import {
  create,
  type Document,
  getOptions,
  knowledgeBases,
  list,
  remove,
  update,
} from './service';

type FormValues = Omit<
  BackendAPI.CreateAiDocumentDto,
  'steps' | 'standardQuestions' | 'synonyms' | 'keywords'
> & {
  steps: string;
  standardQuestions: string;
  synonyms: string;
  keywords: string;
};
const lines = (value: string) =>
  value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

export default function Documents() {
  const { t, run, load, report, pending } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Document | null>();
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
  const columns: ProColumns<Document>[] = [
    { title: t('title', '标题'), dataIndex: 'title' },
    { title: t('status', '状态'), dataIndex: 'status' },
    { title: t('aiVersion', '内容版本'), dataIndex: 'version' },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, r) => [
        <Button key="edit" type="link" onClick={() => setEditing(r)}>
          {t('edit', '编辑')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t(
            'aiDeleteDocument',
            '删除后历史回答的来源将失效，确认删除？',
          )}
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
    <PageContainer title={t('aiDocuments', 'AI 操作指南')}>
      <ProTable<Document>
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
          width={800}
          title={t('aiDocument', '操作指南')}
          initialValues={
            editing
              ? {
                  ...editing,
                  pageCode: editing.pageCode ?? undefined,
                  steps: editing.steps.join('\n'),
                  standardQuestions: editing.standardQuestions.join('\n'),
                  synonyms: editing.synonyms.join('\n'),
                  keywords: editing.keywords.join('\n'),
                }
              : {
                  status: 'draft',
                  isPublic: false,
                  permissionMode: 'ALL',
                  permissions: [],
                  steps: '',
                  standardQuestions: '',
                  synonyms: '',
                  keywords: '',
                }
          }
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          submitter={{ submitButtonProps: { loading: pending } }}
          onFinish={(values) => {
            const body: BackendAPI.CreateAiDocumentDto = {
              ...values,
              steps: lines(values.steps),
              standardQuestions: lines(values.standardQuestions),
              synonyms: lines(values.synonyms),
              keywords: lines(values.keywords),
              permissions: values.permissions ?? [],
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
              'aiGuideHelp',
              '问题、关键词、同义词和步骤均每行一项。发布前核对业务权限与操作步骤。',
            )}
          />
          <ProFormSelect
            name="knowledgeBaseId"
            label={t('aiKnowledgeBase', '知识库')}
            request={knowledgeBases}
            rules={[{ required: true }]}
          />
          <ProFormText
            name="title"
            label={t('title', '标题')}
            rules={[{ required: true, max: 200 }]}
          />
          <ProFormTextArea
            name="standardQuestions"
            label={t('aiQuestions', '标准问题（每行一项）')}
            fieldProps={{ maxLength: 6000 }}
          />
          <ProFormTextArea
            name="synonyms"
            label={t('aiSynonyms', '同义词（每行一项）')}
            fieldProps={{ maxLength: 5000 }}
          />
          <ProFormTextArea
            name="keywords"
            label={t('aiKeywords', '关键词（每行一项）')}
            fieldProps={{ maxLength: 5000 }}
          />
          <ProFormTextArea
            name="content"
            label={t('aiContent', '操作说明')}
            fieldProps={{ maxLength: 12000 }}
            rules={[{ required: true }]}
          />
          <ProFormTextArea
            name="steps"
            label={t('aiSteps', '操作步骤（每行一步）')}
            fieldProps={{ maxLength: 50000 }}
          />
          <ProFormSelect
            name="pageCode"
            label={t('aiNavigation', '导航页面')}
            options={options.pages}
            allowClear
          />
          <ProFormSelect
            name="status"
            label={t('status', '状态')}
            options={[
              { value: 'draft', label: t('aiDraft', '草稿') },
              { value: 'published', label: t('aiPublished', '已发布') },
              { value: 'disabled', label: t('disabled', '停用') },
            ]}
            rules={[{ required: true }]}
          />
          <ProFormSwitch
            name="isPublic"
            label={t('aiPublicGuide', '向有权使用该助手的用户公开')}
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
            label={t('aiBusinessPermissions', '业务权限')}
            mode="multiple"
            options={options.permissions}
            fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
