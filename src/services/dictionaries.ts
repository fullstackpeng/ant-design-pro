import * as dictionaries from './backend/dictionaries';
import * as platform from './backend/platformDictionaries';

export type DictionaryScope = 'platform' | 'tenant';
export interface DictionaryReference { scope: DictionaryScope; code: string; }

export const getDictionary = (scope: DictionaryScope, code: string) =>
  scope === 'platform'
    ? platform.getPlatformDictionary({ code }, { skipErrorHandler: true })
    : dictionaries.getDictionary({ code }, { skipErrorHandler: true });

export const dictionaryQueryKey = (scope: DictionaryScope, tenantId: string | undefined, userId: string | undefined, code: string) =>
  ['dictionaries', scope, tenantId, userId, code] as const;
