import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIntl, useModel } from '@umijs/max';
import { App } from 'antd';
import { useCallback } from 'react';
import { accountProfile } from './service';
export type AccountText = (id: string, fallback: string) => string;

export function useAccountProfile() {
  const { initialState, setInitialState } = useModel('@@initialState');
  const queryClient = useQueryClient();
  const intl = useIntl();
  const { message } = App.useApp();
  const userId = initialState?.currentUser?.userid;
  const tenantId = initialState?.currentUser?.tenant?.id ?? 'platform';
  const t: AccountText = useCallback(
    (id, fallback) =>
      intl.formatMessage({ id: `account.${id}`, defaultMessage: fallback }),
    [intl],
  );
  const query = useQuery({
    queryKey: ['account-profile', userId, tenantId],
    queryFn: () => accountProfile().then((result) => result.data),
    enabled: Boolean(userId),
  });
  const report = (error: unknown) => {
    const detail = (
      error as { response?: { data?: { errorMessage?: string } } }
    ).response?.data?.errorMessage;
    message.error(detail ?? t('failed', '操作失败，请重试'));
  };
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['account-profile'],
      refetchType: 'none',
    });
    const result = await query.refetch({ throwOnError: true });
    if (result.data) {
      const profile = result.data;
      await setInitialState((state) => {
        const currentUser = state?.currentUser;
        if (
          !currentUser ||
          currentUser.userid !== userId ||
          (currentUser.tenant?.id ?? 'platform') !== tenantId
        )
          return state;
        return {
          ...state,
          currentUser: {
            ...currentUser,
            name: profile.name,
            avatar: profile.avatar ?? undefined,
          },
        };
      });
    }
  };
  return { ...query, t, report, refresh };
}
