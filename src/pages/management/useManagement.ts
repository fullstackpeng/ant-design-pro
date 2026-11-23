import { useIntl } from '@umijs/max';
import { App } from 'antd';
import { useCallback, useState } from 'react';

export interface TableResult<T> {
  success: boolean;
  data: T[];
  total: number;
}

export function useManagement() {
  const intl = useIntl();
  const { message } = App.useApp();
  const [pending, setPending] = useState(false);
  const t = useCallback(
    (id: string, defaultMessage: string) =>
      intl.formatMessage({ id: `management.${id}`, defaultMessage }),
    [intl],
  );
  const report = useCallback(
    (error: unknown) => {
      const detail = (
        error as { response?: { data?: { errorMessage?: string } } }
      ).response?.data?.errorMessage;
      message.error(detail ?? t('failed', '操作失败，请重试'));
    },
    [message, t],
  );
  const run = useCallback(
    async (work: () => Promise<unknown>, refresh: () => void) => {
      setPending(true);
      try {
        await work();
        message.success(t('saved', '操作成功'));
        refresh();
        return true;
      } catch (error) {
        report(error);
        return false;
      } finally {
        setPending(false);
      }
    },
    [message, report, t],
  );
  const load = useCallback(
    async <T>(work: () => Promise<TableResult<T>>): Promise<TableResult<T>> => {
      try {
        return await work();
      } catch (error) {
        report(error);
        return { data: [], success: false, total: 0 };
      }
    },
    [report],
  );
  return { t, run, load, report, pending };
}
