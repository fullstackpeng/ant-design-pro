import { useQuery } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import type { DictionaryScope } from '@/services/dictionaries';
import { dictionaryQueryKey, getDictionary } from '@/services/dictionaries';

export function useDictionary(scope: DictionaryScope, code: string) {
  const { initialState } = useModel('@@initialState');
  const user = initialState?.currentUser;
  const tenantId = user?.tenant?.id;
  const enabled =
    !!user?.userid && !!code && (scope === 'platform' || !!tenantId);
  const query = useQuery({
    queryKey: dictionaryQueryKey(scope, tenantId, user?.userid, code),
    queryFn: async () => (await getDictionary(scope, code)).data,
    enabled,
    staleTime: 0,
    retry: false,
  });
  // A query disabled after logout must never expose a previous tenant's data.
  return {
    ...query,
    data: enabled ? query.data : undefined,
    available: enabled,
  };
}
