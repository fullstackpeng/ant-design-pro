import { useIntl } from '@umijs/max';
import { App } from 'antd';
import { useState } from 'react';

export interface TableResult<T> {
  success: boolean;
  data: T[];
  total: number;
}

export function useManagement() {
  const intl = useIntl();
  const { message } = App.useApp();
  const [pending, setPending] = useState(false);
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id: `management.${id}`, defaultMessage });
  const report = (error: unknown) => {
    const detail = (
      error as { response?: { data?: { errorMessage?: string } } }
    ).response?.data?.errorMessage;
    message.error(detail ?? t('failed', '操作失败，请重试'));
  };
  const run = async (work: () => Promise<unknown>, refresh: () => void) => {
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
  };
  const load = async <T>(
    work: () => Promise<TableResult<T>>,
  ): Promise<TableResult<T>> => {
    try {
      return await work();
    } catch (error) {
      report(error);
      return { data: [], success: false, total: 0 };
    }
  };
  return { t, run, load, report, pending };
}
