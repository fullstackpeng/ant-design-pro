import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import { createPlan, listPlans, type Plan, updatePlan } from './service';

export default function Plans() {
  const { t, run, load } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Plan | null>();
  const columns: ProColumns<Plan>[] = [
    { title: t('code', '编码'), dataIndex: 'code' },
    { title: t('name', '名称'), dataIndex: 'name' },
    { title: t('maxMembers', '启用成员数上限'), dataIndex: 'maxMembers' },
    {
      title: t('allowAssignment', '允许分配'),
      dataIndex: 'isActive',
      render: (_, row) => (
        <Tag color={row.isActive ? 'green' : 'default'}>
          {row.isActive ? t('yes', '是') : t('no', '否')}
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
      ],
    },
  ];
  return (
    <PageContainer
      title={t('plans', '套餐管理')}
      content={t(
        'plansHelp',
        '人工分配套餐，不涉及支付。调整上限会影响已分配租户；停止分配不影响现有订阅。',
      )}
    >
      <ProTable<Plan>
        rowKey="id"
        actionRef={action}
        columns={columns}
        search={false}
        request={(params) => load(() => listPlans(params))}
        toolBarRender={() => [
          <Button key="new" type="primary" onClick={() => setEditing(null)}>
            {t('createPlan', '新增套餐')}
          </Button>,
        ]}
      />
      {editing !== undefined && (
        <ModalForm<Plan>
          title={
            editing ? t('editPlan', '编辑套餐') : t('createPlan', '新增套餐')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={editing ?? { maxMembers: 10, isActive: true }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updatePlan(editing.id, {
                      name: values.name,
                      maxMembers: values.maxMembers,
                      isActive: values.isActive,
                    })
                  : createPlan(values),
              () => {
                setEditing(undefined);
                action.current?.reload();
              },
            )
          }
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
            rules={[{ required: true }, { max: 100 }]}
          />
          <ProFormDigit
            name="maxMembers"
            label={t('maxMembers', '启用成员数上限')}
            min={1}
            max={100000}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch
            name="isActive"
            label={t('allowAssignment', '允许分配')}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
