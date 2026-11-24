import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';
import { useManagement } from '../../useManagement';
import { create, type KnowledgeBase, list, remove, update } from './service';

export default function KnowledgeBases() {
  const { t, run, load, pending } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<KnowledgeBase | null>();
  const reload = () => {
    action.current?.reload();
  };
  const columns: ProColumns<KnowledgeBase>[] = [
    { title: t('code', '编码'), dataIndex: 'code' },
    { title: t('name', '名称'), dataIndex: 'name' },
    { title: t('description', '说明'), dataIndex: 'description' },
    {
      title: t('status', '状态'),
      dataIndex: 'isActive',
      render: (_, r) =>
        r.isActive ? t('enabled', '启用') : t('disabled', '停用'),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, r) => [
        <Button key="edit" type="link" onClick={() => setEditing(r)}>
          {t('edit', '编辑')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t('aiDeleteBase', '仅未关联的知识库可删除，确认删除？')}
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
    <PageContainer
      title={t('aiKnowledgeBases', 'AI 知识库')}
      content={t(
        'aiSharedKnowledge',
        '平台统一维护共享知识，停用后相关指南立即退出检索。',
      )}
    >
      <ProTable<KnowledgeBase>
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
        <ModalForm<BackendAPI.CreateAiKnowledgeBaseDto>
          open
          title={t('aiKnowledgeBase', '知识库')}
          initialValues={editing ?? { description: '', isActive: true }}
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          submitter={{ submitButtonProps: { loading: pending } }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? update(editing.id, {
                      ...values,
                      revision: editing.revision,
                    })
                  : create(values),
              () => {
                setEditing(undefined);
                reload();
              },
            )
          }
        >
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
          <ProFormTextArea
            name="description"
            label={t('description', '说明')}
            fieldProps={{ maxLength: 500 }}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </PageContainer>
  );
}
