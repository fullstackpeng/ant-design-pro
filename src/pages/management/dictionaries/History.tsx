import { type ProColumns, ProTable } from '@ant-design/pro-components';
import React from 'react';
import type { DictionaryScope } from '@/services/dictionaries';
import { useManagement } from '../useManagement';
import { listDictionaryHistory } from './service';

export default function DictionaryHistory({
  scope,
  code,
  updatedAt,
}: {
  scope: DictionaryScope;
  code: string;
  updatedAt: number;
}) {
  const { t, load } = useManagement();
  const fields: Record<string, string> = {
    name: t('name', '名称'),
    remark: t('remark', '备注'),
    label: t('dictionaryLabel', '标签'),
    value: t('dictionaryValue', '值'),
    code: t('code', '编码'),
    sortOrder: t('sortOrder', '排序'),
    isActive: t('dictionaryStatus', '状态'),
    color: t('dictionaryColor', '标签颜色'),
  };
  const display = (value: unknown) =>
    typeof value === 'boolean'
      ? value
        ? t('enabled', '启用')
        : t('disabled', '停用')
      : String(value ?? '') || '—';
  const columns: ProColumns<BackendAPI.DictionaryAuditDto>[] = [
    {
      title: t('changedAt', '修改时间'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 180,
    },
    { title: t('changedBy', '修改人'), dataIndex: 'actorName', width: 120 },
    {
      title: t('dictionaryTarget', '对象'),
      render: (_, row) =>
        row.entityType === 'type'
          ? t('dictionaryType', '字典类型')
          : row.targetValue,
      width: 150,
    },
    {
      title: t('actions', '操作'),
      render: (_, row) =>
        row.action === 'create' ? t('create', '新增') : t('edit', '编辑'),
      width: 80,
    },
    {
      title: t('dictionaryChanges', '变更内容'),
      render: (_, row) =>
        Object.keys(fields)
          .filter(
            (key) => key in row.after && row.before[key] !== row.after[key],
          )
          .map((key) => (
            <div key={key} className="break-all">
              {fields[key]}：
              {row.action === 'create' ? '' : `${display(row.before[key])} → `}
              {display(row.after[key])}
            </div>
          )),
    },
  ];
  return (
    <ProTable<BackendAPI.DictionaryAuditDto>
      className="mt-4"
      rowKey="id"
      headerTitle={t('dictionaryHistory', '字典变更记录')}
      columns={columns}
      search={false}
      options={false}
      params={{ code, updatedAt }}
      request={(params) =>
        load(() =>
          listDictionaryHistory(scope, code, {
            current: params.current,
            pageSize: params.pageSize,
          }),
        )
      }
    />
  );
}
