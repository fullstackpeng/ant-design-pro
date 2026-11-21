import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import ScheduledTasks from './index';
import Runs from './Runs';
import {
  createTask,
  getRun,
  listHandlers,
  listRuns,
  listTasks,
  rerun,
  type Task,
  type TaskRun,
  triggerTask,
} from './service';

vi.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
      defaultMessage,
  }),
}));
vi.mock('./service', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  setEnabled: vi.fn(),
  removeTask: vi.fn(),
  triggerTask: vi.fn(),
  listHandlers: vi.fn(),
  listRuns: vi.fn(),
  getRun: vi.fn(),
  rerun: vi.fn(),
  tenantOptions: vi.fn(),
}));

const task: Task = {
  id: '1',
  name: '启用任务',
  type: 'internal',
  handler: 'system.ping',
  cron: '0 * * * *',
  timezone: 'Asia/Taipei',
  scope: 'global',
  tenantIds: [],
  params: {},
  enabled: true,
  timeoutMs: 30000,
  maxAttempts: 3,
  concurrency: 1,
  revision: 1,
  syncedRevision: 1,
  syncError: '',
  createdAt: '2026-11-21T00:00:00Z',
  updatedAt: '2026-11-21T00:00:00Z',
};
const failedRun: TaskRun = {
  id: '11111111-1111-4111-8111-111111111111',
  taskId: '1',
  taskName: '超时任务',
  type: 'internal',
  source: 'manual',
  tenantId: null,
  retryOf: null,
  status: 'timed_out',
  attemptsMade: 1,
  createdAt: task.createdAt,
  startedAt: task.createdAt,
  finishedAt: task.createdAt,
  durationMs: 100,
  error: '任务执行超时',
  result: null,
  snapshot: { handler: 'system.ping', params: {} },
  idempotencyKey: 'business-key',
  attempts: [
    {
      id: 'attempt-1',
      number: 1,
      status: 'timed_out',
      startedAt: task.createdAt,
      finishedAt: task.createdAt,
      durationMs: 100,
      error: '任务执行超时',
    },
  ],
};
const wrap = (children: React.ReactNode) => (
  <ConfigProvider locale={zhCN}>
    <App>{children}</App>
  </ConfigProvider>
);
const confirm = () =>
  page.getByRole('button', { name: /^(确\s*定|OK|Confirm|Submit|提\s*交)$/ });

describe('platform task management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTasks).mockResolvedValue({
      success: true,
      data: [task, { ...task, id: '2', name: '停用任务', enabled: false }],
      total: 2,
    });
    vi.mocked(listHandlers).mockResolvedValue({
      success: true,
      data: [
        {
          code: 'system.ping',
          name: '系统连通性检查',
          scopes: ['global', 'tenant'],
          feature: null,
        },
      ],
    });
    vi.mocked(triggerTask).mockResolvedValue({
      success: true,
      data: 'dispatch-1',
    });
    vi.mocked(createTask).mockResolvedValue({ success: true, data: task });
    vi.mocked(listRuns).mockResolvedValue({
      success: true,
      data: [failedRun],
      total: 1,
    });
    vi.mocked(getRun).mockResolvedValue({ success: true, data: failedRun });
    vi.mocked(rerun).mockResolvedValue({ success: true, data: 'rerun-1' });
  });

  it('disables manual execution for disabled tasks and confirms enabled execution', async () => {
    const screen = await render(wrap(<ScheduledTasks />));
    const disabled = screen.getByRole('row', { name: /停用任务/ });
    await expect
      .element(disabled.getByRole('button', { name: '立即执行' }))
      .toBeDisabled();
    const enabled = screen.getByRole('row', { name: /启用任务/ });
    await enabled.getByRole('button', { name: '立即执行' }).click();
    expect(triggerTask).not.toHaveBeenCalled();
    await confirm().click();
    await vi.waitFor(() => expect(triggerTask).toHaveBeenCalledWith(task));
  });

  it('rejects invalid parameter JSON and creates a task with safe defaults', async () => {
    await render(wrap(<ScheduledTasks />));
    await page.getByRole('button', { name: '新增任务', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabelText(/任务名称/).fill('新任务');
    await dialog.getByLabelText(/参数 JSON/).fill('[]');
    await confirm().click();
    await expect
      .element(page.getByText('请输入有效的 JSON 对象', { exact: true }))
      .toBeVisible();
    expect(createTask).not.toHaveBeenCalled();
    await dialog.getByLabelText(/参数 JSON/).fill('{}');
    await confirm().click();
    await vi.waitFor(() =>
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新任务',
          enabled: false,
          type: 'internal',
          scope: 'global',
          tenantIds: [],
          params: {},
          maxAttempts: 3,
        }),
      ),
    );
  });

  it('shows snapshot and attempt details and confirms rerunning a failed execution', async () => {
    await render(wrap(<Runs taskId="1" />));
    await page.getByRole('button', { name: '详情', exact: true }).click();
    await expect
      .element(page.getByText('business-key', { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText('执行配置快照', { exact: true }))
      .toBeVisible();
    await page.getByRole('button', { name: /Close|关\s*闭/ }).click();
    await page.getByRole('button', { name: '重新执行', exact: true }).click();
    expect(rerun).not.toHaveBeenCalled();
    await confirm().click();
    await vi.waitFor(() => expect(rerun).toHaveBeenCalledWith(failedRun.id));
    expect(listRuns).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: '1' }),
    );
  });
});
