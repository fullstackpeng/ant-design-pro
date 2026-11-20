import * as dictionaries from '@/services/backend/dictionaries';

export type Dictionary = BackendAPI.DictionaryDto;
export type DictionaryItem = BackendAPI.DictionaryItemDto;
export const listDictionaries = (
  params: BackendAPI.listDictionariesParams = {},
) => dictionaries.listDictionaries(params, { skipErrorHandler: true });
export const createDictionary = (body: BackendAPI.CreateDictionaryDto) =>
  dictionaries.createDictionary(body, { skipErrorHandler: true });
export const updateDictionary = (
  code: string,
  body: BackendAPI.UpdateDictionaryDto,
) => dictionaries.updateDictionary({ code }, body, { skipErrorHandler: true });
export const createDictionaryItem = (
  code: string,
  body: BackendAPI.CreateDictionaryItemDto,
) =>
  dictionaries.createDictionaryItem(
    { code },
    { ...body, color: body.color ?? '' },
    { skipErrorHandler: true },
  );
export const updateDictionaryItem = (
  code: string,
  id: string,
  body: BackendAPI.UpdateDictionaryItemDto,
) =>
  dictionaries.updateDictionaryItem(
    { code, id },
    { ...body, color: body.color ?? '' },
    {
      skipErrorHandler: true,
    },
  );
