import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import { Alert, Button, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { DictionarySelect, DictionaryText } from '@/components/Dictionary';
import { useDictionary } from '@/components/Dictionary/useDictionary';
import { useManagement } from '../useManagement';
import {
  createDictionary,
  createDictionaryItem,
  type Dictionary,
  type DictionaryItem,
  listDictionaries,
  updateDictionary,
  updateDictionaryItem,
} from './service';

function DictionaryItems({
  code,
  canCreate,
  canUpdate,
}: {
  code: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const { t, run } = useManagement();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useDictionary(code);
  const [editing, setEditing] = useState<DictionaryItem | null>();
  const [single, setSingle] = useState<string | string[]>();
  const [multiple, setMultiple] = useState<string | string[]>([]);
  const columns: ProColumns<DictionaryItem>[] = [
    { title: t('dictionaryValue', '值'), dataIndex: 'value' },
    {
      title: t('dictionaryLabel', '标签'),
      dataIndex: 'label',
      render: (_, row) => <Tag color={row.color || undefined}>{row.label}</Tag>,
    },
    { title: t('sortOrder', '排序'), dataIndex: 'sortOrder', width: 90 },
    {
      title: t('dictionaryStatus', '状态'),
      dataIndex: 'isActive',
      render: (_, row) =>
        row.isActive ? t('enabled', '启用') : t('disabled', '停用'),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) =>
        canUpdate
          ? [
              <Button key="edit" type="link" onClick={() => setEditing(row)}>
                {t('edit', '编辑')}
              </Button>,
            ]
          : [],
    },
  ];
  return (
    <>
      {isError && (
        <Alert
          type="error"
          title={t('dictionaryLoadFailed', '字典加载失败')}
          action={
            <Button onClick={() => void refetch()}>{t('retry', '重试')}</Button>
          }
        />
      )}
      <ProTable<DictionaryItem>
        headerTitle={`${data?.name ?? code} · ${t('dictionaryItems', '字典数据')}`}
        rowKey="id"
        search={false}
        options={false}
        pagination={{ pageSize: 10 }}
        loading={isPending}
        dataSource={isError ? [] : (data?.items ?? [])}
        columns={columns}
        toolBarRender={() =>
          canCreate && !isError
            ? [
                <Button
                  key="new"
                  type="primary"
                  onClick={() => setEditing(null)}
                >
                  {t('createDictionaryItem', '新增字典项')}
                </Button>,
              ]
            : []
        }
      />
      <div className="mt-4 rounded-lg bg-white p-4 dark:bg-neutral-900">
        <p>
          {t(
            'dictionaryPreview',
            '使用预览：选项来自当前字典，选择结果仅在本页预览。',
          )}
        </p>
        <Space vertical style={{ width: '100%' }}>
          <DictionarySelect
            aria-label={t('dictionarySingle', '单选预览')}
            dictionaryCode={code}
            value={single}
            onChange={setSingle}
          />
          <DictionaryText dictionaryCode={code} value={single} />
          <DictionarySelect
            aria-label={t('dictionaryMultiple', '多选预览')}
            dictionaryCode={code}
            mode="multiple"
            value={multiple}
            onChange={setMultiple}
          />
          <DictionaryText dictionaryCode={code} value={multiple} />
        </Space>
      </div>
      {editing !== undefined && (
        <ModalForm<BackendAPI.CreateDictionaryItemDto>
          title={
            editing
              ? t('editDictionaryItem', '编辑字典项')
              : t('createDictionaryItem', '新增字典项')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={editing ?? { isActive: true, sortOrder: 0, color: '' }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updateDictionaryItem(code, editing.id, {
                      label: values.label,
                      sortOrder: values.sortOrder,
                      isActive: values.isActive,
                      color: values.color,
                    })
                  : createDictionaryItem(code, values),
              () => {
                setEditing(undefined);
                void queryClient.invalidateQueries({
                  queryKey: ['dictionaries'],
                });
              },
            )
          }
        >
          <ProFormText
            name="value"
            label={t('dictionaryValue', '值')}
            disabled={!!editing}
            rules={[
              { required: true },
              { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/ },
            ]}
          />
          <ProFormText
            name="label"
            label={t('dictionaryLabel', '标签')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProFormDigit
            name="sortOrder"
            label={t('sortOrder', '排序')}
            min={0}
            max={1000000}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSelect
            name="color"
            label={t('dictionaryColor', '标签颜色')}
            options={[
              { value: '', label: t('default', '默认') },
              { value: 'blue', label: t('colorBlue', '蓝色') },
              { value: 'green', label: t('colorGreen', '绿色') },
              { value: 'orange', label: t('colorOrange', '橙色') },
              { value: 'red', label: t('colorRed', '红色') },
              { value: 'purple', label: t('colorPurple', '紫色') },
              { value: 'cyan', label: t('colorCyan', '青色') },
            ]}
            fieldProps={{ allowClear: false }}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </>
  );
}

export default function Dictionaries() {
  const { t, run, load } = useManagement();
  const { initialState } = useModel('@@initialState');
  const queryClient = useQueryClient();
  const permissions = initialState?.navigation?.permissions ?? [];
  const canCreate = permissions.includes('dictionaries:create');
  const canUpdate = permissions.includes('dictionaries:update');
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Dictionary | null>();
  const [selected, setSelected] = useState<string>();
  const columns: ProColumns<Dictionary>[] = [
    {
      title: t('dictionarySearch', '编码或名称'),
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: t('code', '编码'), dataIndex: 'code', search: false },
    { title: t('name', '名称'), dataIndex: 'name', search: false },
    {
      title: t('remark', '备注'),
      dataIndex: 'remark',
      search: false,
      ellipsis: true,
    },
    {
      title: t('dictionaryStatus', '状态'),
      dataIndex: 'isActive',
      search: false,
      render: (_, row) => (
        <Tag color={row.isActive ? 'green' : undefined}>
          {row.isActive ? t('enabled', '启用') : t('disabled', '停用')}
        </Tag>
      ),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="items" type="link" onClick={() => setSelected(row.code)}>
          {t('dictionaryItems', '字典数据')}
        </Button>,
        ...(canUpdate
          ? [
              <Button key="edit" type="link" onClick={() => setEditing(row)}>
                {t('edit', '编辑')}
              </Button>,
            ]
          : []),
      ],
    },
  ];
  return (
    <PageContainer
      title={t('dictionaries', '字典管理')}
      content={t(
        'dictionaryHelp',
        '维护本企业的表单选项。编码和值创建后不可修改；停用后保留历史展示。',
      )}
    >
      <ProTable<Dictionary>
        rowKey="code"
        actionRef={action}
        columns={columns}
        request={(params) =>
          load(() =>
            listDictionaries({
              current: params.current,
              pageSize: params.pageSize,
              keyword: params.keyword,
            }),
          )
        }
        toolBarRender={() =>
          canCreate
            ? [
                <Button
                  key="new"
                  type="primary"
                  onClick={() => setEditing(null)}
                >
                  {t('createDictionary', '新增字典类型')}
                </Button>,
              ]
            : []
        }
      />
      {selected && (
        <DictionaryItems
          key={selected}
          code={selected}
          canCreate={canCreate}
          canUpdate={canUpdate}
        />
      )}
      {editing !== undefined && (
        <ModalForm<BackendAPI.CreateDictionaryDto>
          title={
            editing
              ? t('editDictionary', '编辑字典类型')
              : t('createDictionary', '新增字典类型')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={editing ?? { isActive: true, remark: '' }}
          onFinish={(values) =>
            run(
              () =>
                editing
                  ? updateDictionary(editing.code, {
                      name: values.name,
                      remark: values.remark ?? '',
                      isActive: values.isActive,
                    })
                  : createDictionary({
                      ...values,
                      remark: values.remark ?? '',
                    }),
              () => {
                setEditing(undefined);
                action.current?.reload();
                void queryClient.invalidateQueries({
                  queryKey: ['dictionaries'],
                });
                if (!editing) setSelected(values.code.trim());
              },
            )
          }
        >
          <ProFormText
            name="code"
            label={t('code', '编码')}
            disabled={!!editing}
            rules={[{ required: true }, { pattern: /^[a-z][a-z0-9_-]{0,63}$/ }]}
          />
          <ProFormText
            name="name"
            label={t('name', '名称')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProFormTextArea
            name="remark"
            label={t('remark', '备注')}
            rules={[{ max: 500 }]}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </PageContainer>
  );
}
