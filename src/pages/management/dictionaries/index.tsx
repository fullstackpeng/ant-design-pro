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
import { Alert, App, Button, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { DictionarySelect, DictionaryText } from '@/components/Dictionary';
import { useDictionary } from '@/components/Dictionary/useDictionary';
import type { DictionaryScope } from '@/services/dictionaries';
import { useManagement } from '../useManagement';
import DictionaryHistory from './History';
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
  scope,
  code,
  canCreate,
  canUpdate,
}: {
  scope: DictionaryScope;
  code: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const { t, run } = useManagement();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch, dataUpdatedAt } = useDictionary(
    scope,
    code,
  );
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<DictionaryItem | null>();
  const [single, setSingle] = useState<string | string[]>();
  const [multiple, setMultiple] = useState<string | string[]>([]);
  const columns: ProColumns<DictionaryItem>[] = [
    {
      title: t('dictionaryItemSearch', '值或标签'),
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: t('dictionaryValue', '值'), dataIndex: 'value', search: false },
    {
      title: t('dictionaryLabel', '标签'),
      dataIndex: 'label',
      search: false,
      render: (_, row) => <Tag color={row.color || undefined}>{row.label}</Tag>,
    },
    {
      title: t('sortOrder', '排序'),
      dataIndex: 'sortOrder',
      width: 90,
      search: false,
    },
    {
      title: t('dictionaryStatus', '状态'),
      dataIndex: 'isActive',
      search: false,
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
        search={{ labelWidth: 'auto' }}
        onSubmit={(params) =>
          setKeyword((params.keyword ?? '').trim().toLowerCase())
        }
        onReset={() => setKeyword('')}
        options={false}
        pagination={{ pageSize: 10 }}
        loading={isPending}
        dataSource={
          isError
            ? []
            : (data?.items ?? []).filter(
                (item) =>
                  !keyword ||
                  item.value.toLowerCase().includes(keyword) ||
                  item.label.toLowerCase().includes(keyword),
              )
        }
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
            scope={scope}
            aria-label={t('dictionarySingle', '单选预览')}
            dictionaryCode={code}
            value={single}
            onChange={setSingle}
          />
          <DictionaryText scope={scope} dictionaryCode={code} value={single} />
          <DictionarySelect
            scope={scope}
            aria-label={t('dictionaryMultiple', '多选预览')}
            dictionaryCode={code}
            mode="multiple"
            value={multiple}
            onChange={setMultiple}
          />
          <DictionaryText
            scope={scope}
            dictionaryCode={code}
            value={multiple}
          />
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
          onFinish={async (values) => {
            if (scope === 'platform' && editing?.isActive && !values.isActive) {
              const confirmed = await modal.confirm({
                title: t('disableSharedDictionary', '停用平台共享选项？'),
                content: t(
                  'disableSharedDictionaryHelp',
                  '此操作会影响所有企业的新录入；已有记录继续保留标签展示。',
                ),
                okText: t('confirmDisable', '确认停用'),
                cancelText: t('cancel', '取消'),
              });
              if (!confirmed) return false;
            }
            return run(
              () =>
                editing
                  ? updateDictionaryItem(
                      scope,
                      code,
                      editing.id,
                      {
                        label: values.label,
                        sortOrder: values.sortOrder,
                        isActive: values.isActive,
                        color: values.color,
                      },
                      editing.revision,
                    )
                  : createDictionaryItem(scope, code, values),
              () => {
                setEditing(undefined);
                void queryClient.invalidateQueries({
                  queryKey: ['dictionaries'],
                });
              },
            );
          }}
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
      <DictionaryHistory scope={scope} code={code} updatedAt={dataUpdatedAt} />
    </>
  );
}

export default function Dictionaries({
  scope = 'tenant',
}: {
  scope?: DictionaryScope;
}) {
  const { t, run, load } = useManagement();
  const { modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const queryClient = useQueryClient();
  const permissions = initialState?.navigation?.permissions ?? [];
  const canCreate =
    scope === 'platform'
      ? initialState?.currentUser?.isPlatformAdmin === true
      : permissions.includes('dictionaries:create');
  const canUpdate =
    scope === 'platform'
      ? initialState?.currentUser?.isPlatformAdmin === true
      : permissions.includes('dictionaries:update');
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
      title={
        scope === 'platform'
          ? t('platformDictionaries', '平台字典')
          : t('dictionaries', '字典管理')
      }
      content={
        scope === 'platform'
          ? t(
              'platformDictionaryHelp',
              '平台统一维护，所有企业只读使用。修改标签会影响所有引用页面；停用后保留历史展示。',
            )
          : t(
              'dictionaryHelp',
              '维护本企业的表单选项。编码和值创建后不可修改；停用后保留历史展示。',
            )
      }
    >
      <ProTable<Dictionary>
        rowKey="code"
        actionRef={action}
        columns={columns}
        request={(params) =>
          load(() =>
            listDictionaries(scope, {
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
          key={`${scope}:${selected}`}
          scope={scope}
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
          onFinish={async (values) => {
            if (scope === 'platform' && editing?.isActive && !values.isActive) {
              const confirmed = await modal.confirm({
                title: t('disableSharedDictionaryType', '停用平台共享字典？'),
                content: t(
                  'disableSharedDictionaryHelp',
                  '此操作会影响所有企业的新录入；已有记录继续保留标签展示。',
                ),
                okText: t('confirmDisable', '确认停用'),
                cancelText: t('cancel', '取消'),
              });
              if (!confirmed) return false;
            }
            return run(
              () =>
                editing
                  ? updateDictionary(
                      scope,
                      editing.code,
                      {
                        name: values.name,
                        remark: values.remark ?? '',
                        isActive: values.isActive,
                      },
                      editing.revision,
                    )
                  : createDictionary(scope, {
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
            );
          }}
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
