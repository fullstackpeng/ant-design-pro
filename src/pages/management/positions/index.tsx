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
import { useModel } from '@umijs/max';
import { Button, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';

import { useManagement } from '../useManagement';
import {
  createPosition,
  deletePosition,
  listPositions,
  type Position,
  updatePosition,
} from './service';

export default function Positions() {
  const { t, run, report, pending } = useManagement();
  const { initialState } = useModel('@@initialState');
  const permissions = initialState?.navigation?.permissions ?? [];
  const can = (operation: string) =>
    permissions.includes(`positions:${operation}`);
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Position | null>();

  const reload = () => action.current?.reload();
  const columns: ProColumns<Position>[] = [
    { title: t('positionName', '岗位名称'), dataIndex: 'name' },
    { title: t('positionCode', '岗位编码'), dataIndex: 'code' },
    { title: t('sortOrder', '排序'), dataIndex: 'sortOrder', width: 100 },
    {
      title: t('status', '状态'),
      dataIndex: 'isActive',
      render: (_, row) =>
        row.isActive ? t('enabled', '启用') : t('disabled', '停用'),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        can('update') && (
          <Button key="edit" type="link" onClick={() => setEditing(row)}>
            {t('edit', '编辑')}
          </Button>
        ),
        can('delete') && (
          <Popconfirm
            key="delete"
            title={t('deletepositionConfirm', '确认删除该岗位？')}
            onConfirm={() => run(() => deletePosition(row.id), reload)}
            okButtonProps={{ loading: pending }}
          >
            <Button type="link" danger>
              {t('delete', '删除')}
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];
  return (
    <PageContainer title={t('positionsManagement', '岗位管理')}>
      <ProTable<Position>
        rowKey="id"
        actionRef={action}
        columns={columns}
        search={false}
        request={async () => {
          try {
            const result = await listPositions();

            return { ...result, data: result.data, total: result.data.length };
          } catch (error) {
            report(error);
            return { success: false, data: [], total: 0 };
          }
        }}
        toolBarRender={() => [
          can('create') && (
            <Button key="new" type="primary" onClick={() => setEditing(null)}>
              {t('createposition', '新增岗位')}
            </Button>
          ),
        ]}
      />
      {editing !== undefined && (
        <ModalForm<BackendAPI.CreatePositionDto>
          title={
            editing
              ? t('editposition', '编辑岗位')
              : t('createposition', '新增岗位')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={
            editing ? { ...editing } : { sortOrder: 0, isActive: true }
          }
          onFinish={(values) =>
            run(
              () => {
                const body = { ...values };
                return editing
                  ? updatePosition(editing.id, body)
                  : createPosition(body);
              },
              () => {
                setEditing(undefined);
                reload();
              },
            )
          }
        >
          <ProFormText
            name="name"
            label={t('positionName', '岗位名称')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProFormText
            name="code"
            label={t('positionCode', '岗位编码')}
            rules={[{ required: true, whitespace: true }, { max: 64 }]}
          />

          <ProFormDigit
            name="sortOrder"
            label={t('sortOrder', '排序')}
            min={0}
            max={1000000}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </PageContainer>
  );
}
