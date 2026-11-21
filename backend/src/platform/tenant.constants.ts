import type { DictionaryReference } from '../dictionaries/dictionary-reference.js';

export const tenantIndustryDictionary = {
  scope: 'platform',
  code: 'industry',
} as const satisfies DictionaryReference;
