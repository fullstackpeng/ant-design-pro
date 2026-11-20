import * as dictionaries from './backend/dictionaries';

export const getDictionary = (code: string) =>
  dictionaries.getDictionary({ code }, { skipErrorHandler: true });

export const dictionaryQueryKey = (tenantId: string | undefined, userId: string | undefined, code: string) =>
  ['dictionaries', tenantId, userId, code] as const;
