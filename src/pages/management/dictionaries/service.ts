import * as dictionaries from '@/services/backend/dictionaries';
import * as platform from '@/services/backend/platformDictionaries';
import type { DictionaryScope } from '@/services/dictionaries';

export type Dictionary = BackendAPI.DictionaryDto & { revision?: number };
export type DictionaryItem = BackendAPI.DictionaryItemDto & {
  revision?: number;
};

function revision(value: number | undefined): number {
  if (value === undefined) throw new Error('请刷新后重新编辑平台字典');
  return value;
}

export const listDictionaries = (
  scope: DictionaryScope,
  params: BackendAPI.listDictionariesParams = {},
) =>
  scope === 'platform'
    ? platform.listPlatformDictionaries(params, { skipErrorHandler: true })
    : dictionaries.listDictionaries(params, { skipErrorHandler: true });
export const createDictionary = (
  scope: DictionaryScope,
  body: BackendAPI.CreateDictionaryDto,
) =>
  scope === 'platform'
    ? platform.createPlatformDictionary(
        { ...body, remark: body.remark ?? '' },
        { skipErrorHandler: true },
      )
    : dictionaries.createDictionary(
        { ...body, remark: body.remark ?? '' },
        { skipErrorHandler: true },
      );
export const updateDictionary = (
  scope: DictionaryScope,
  code: string,
  body: BackendAPI.UpdateDictionaryDto,
  expectedRevision?: number,
) =>
  scope === 'platform'
    ? platform.updatePlatformDictionary(
        { code },
        {
          ...body,
          remark: body.remark ?? '',
          revision: revision(expectedRevision),
        },
        { skipErrorHandler: true },
      )
    : dictionaries.updateDictionary(
        { code },
        { ...body, remark: body.remark ?? '' },
        { skipErrorHandler: true },
      );
export const createDictionaryItem = (
  scope: DictionaryScope,
  code: string,
  body: BackendAPI.CreateDictionaryItemDto,
) =>
  scope === 'platform'
    ? platform.createPlatformDictionaryItem(
        { code },
        { ...body, color: body.color ?? '' },
        { skipErrorHandler: true },
      )
    : dictionaries.createDictionaryItem(
        { code },
        { ...body, color: body.color ?? '' },
        { skipErrorHandler: true },
      );
export const updateDictionaryItem = (
  scope: DictionaryScope,
  code: string,
  id: string,
  body: BackendAPI.UpdateDictionaryItemDto,
  expectedRevision?: number,
) =>
  scope === 'platform'
    ? platform.updatePlatformDictionaryItem(
        { code, id },
        {
          ...body,
          color: body.color ?? '',
          revision: revision(expectedRevision),
        },
        { skipErrorHandler: true },
      )
    : dictionaries.updateDictionaryItem(
        { code, id },
        { ...body, color: body.color ?? '' },
        { skipErrorHandler: true },
      );
export const listDictionaryHistory = (
  scope: DictionaryScope,
  code: string,
  params: { current?: number; pageSize?: number },
) =>
  scope === 'platform'
    ? platform.listPlatformDictionaryHistory(
        { code, ...params },
        { skipErrorHandler: true },
      )
    : dictionaries.listDictionaryHistory(
        { code, ...params },
        { skipErrorHandler: true },
      );
