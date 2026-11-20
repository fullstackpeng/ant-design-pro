import { useIntl } from '@umijs/max';
import { Alert, Button, Select, type SelectProps, Tag } from 'antd';
import React from 'react';
import { useDictionary } from './useDictionary';

type DictionaryValue = string | string[];
export interface DictionarySelectProps
  extends Omit<
    SelectProps<DictionaryValue>,
    'options' | 'mode' | 'labelInValue' | 'fieldNames' | 'defaultValue'
  > {
  dictionaryCode: string;
  mode?: 'multiple';
}

export function DictionarySelect({
  dictionaryCode,
  value,
  disabled,
  ...props
}: DictionarySelectProps) {
  const { data, isPending, isError, available, refetch } =
    useDictionary(dictionaryCode);
  const intl = useIntl();
  const text = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id: `dictionary.${id}`, defaultMessage });
  const selected = value == null ? [] : Array.isArray(value) ? value : [value];
  const items = data?.items ?? [];
  const options = items
    .filter(
      (item) =>
        (data?.isActive && item.isActive) || selected.includes(item.value),
    )
    .map((item) => ({
      value: item.value,
      label: `${item.label}${!data?.isActive || !item.isActive ? ` (${text('inactive', '已停用')})` : ''}`,
      disabled: !data?.isActive || !item.isActive,
    }));
  for (const missing of selected.filter(
    (entry) => !items.some((item) => item.value === entry),
  )) {
    options.push({
      value: missing,
      label: `${missing} (${text('unknown', '未知值')})`,
      disabled: true,
    });
  }
  return (
    <div>
      <Select<DictionaryValue>
        allowClear
        showSearch={{ optionFilterProp: 'label' }}
        placeholder={text('choose', '请选择')}
        style={{ width: '100%' }}
        {...props}
        value={value}
        disabled={disabled || !available || isPending || isError}
        loading={available && isPending}
        status={isError ? 'error' : props.status}
        options={options}
        notFoundContent={text('empty', '暂无可用选项')}
      />
      {isError && (
        <Alert
          type="error"
          title={text('loadFailed', '字典加载失败')}
          action={
            <Button size="small" onClick={() => void refetch()}>
              {text('retry', '重试')}
            </Button>
          }
        />
      )}
    </div>
  );
}

export function DictionaryText({
  dictionaryCode,
  value,
}: {
  dictionaryCode: string;
  value?: DictionaryValue;
}) {
  const { data, isError, isPending, available } = useDictionary(dictionaryCode);
  const intl = useIntl();
  if (
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && !value.length)
  )
    return <>—</>;
  if (isError || !available)
    return (
      <>
        {intl.formatMessage({
          id: 'dictionary.loadFailed',
          defaultMessage: '字典加载失败',
        })}
      </>
    );
  if (isPending) return <>…</>;
  const values = Array.isArray(value) ? value : [value];
  return (
    <>
      {values.map((entry) => {
        const item = data?.items.find((option) => option.value === entry);
        return (
          <Tag key={entry} color={item?.color || undefined}>
            {item?.label ?? entry}
          </Tag>
        );
      })}
    </>
  );
}
