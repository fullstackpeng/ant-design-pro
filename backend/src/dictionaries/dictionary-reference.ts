import { invalid } from '../common/validation.js';

export interface DictionaryReference {
  scope: 'platform' | 'tenant';
  code: string;
}

export const dictionaryTypeSelect = {
  code: true,
  name: true,
  remark: true,
  isActive: true,
} as const;
export const dictionaryItemSelect = {
  id: true,
  value: true,
  label: true,
  sortOrder: true,
  isActive: true,
  color: true,
} as const;

export function assertDictionaryValues(
  dictionary: {
    isActive: boolean;
    items: { value: string; isActive: boolean }[];
  },
  values: string[],
  previousValues: string[],
) {
  if (new Set(values).size !== values.length) invalid('字典值不能重复');
  for (const value of values) {
    const item = dictionary.items.find((entry) => entry.value === value);
    if (
      !item ||
      ((!dictionary.isActive || !item.isActive) &&
        !previousValues.includes(value))
    )
      invalid('字典选项不存在或已停用');
  }
}
