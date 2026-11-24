import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import AuditLogs from './index';
import {
  type AuditLog,
  getAuditLog,
  getAuditPolicy,
  listAuditLogs,
  updateAuditPolicy,
} from './service';

const location = vi.hoisted(() => ({
  pathname: '/platform/audit/operation-logs',
}));
vi.mock('@umijs/max', () => ({
  useLocation: () => location,
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
      defaultMessage,
  }),
}));
vi.mock('./service', () => ({
  getAuditLog: vi.fn(),
  getAuditPolicy: vi.fn(),
  listAuditLogs: vi.fn(),
  updateAuditPolicy: vi.fn(),
}));
const log: AuditLog = {
  id: '1',
  eventId: 'event-1',
  eventCode: 'plans.update',
  module: 'plans',
  action: '修改套餐',
  scope: 'platform',
  tenantId: null,
  tenantCode: '',
  tenantName: '',
  actorId: '1',
  actorName: '测试管理员',
  targetTenantId: null,
  targetType: 'plan',
  targetId: '2',
  targetName: '审计测试对象',
  result: 'succeeded',
  message: '',
  requestId: 'request-audit-ui',
  ip: '127.0.0.1',
  userAgent: 'AuditUITest',
  createdAt: '2026-11-24T00:00:00Z',
  changes: [
    {
      changeId: 'change-1',
      entity: 'plan',
      operation: 'update',
      before: { name: '旧名称' },
      after: { name: '新名称' },
    },
  ],
};
const wrap = () => (
  <ConfigProvider locale={zhCN}>
    <App>
      <AuditLogs />
    </App>
  </ConfigProvider>
);
const submit = () =>
  page.getByRole('button', { name: /^(确\s*定|OK|Confirm|Submit|提\s*交)$/ });

describe('audit log pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    location.pathname = '/platform/audit/operation-logs';
    vi.mocked(getAuditPolicy).mockResolvedValue({
      success: true,
      data: { operationDays: 180, loginDays: 180, revision: 3 },
    });
    vi.mocked(listAuditLogs).mockResolvedValue({
      success: true,
      total: 1,
      data: [log],
    });
    vi.mocked(getAuditLog).mockResolvedValue({ success: true, data: log });
    vi.mocked(updateAuditPolicy).mockResolvedValue({
      success: true,
      data: { operationDays: 30, loginDays: 180, revision: 4 },
    });
  });

  it('loads platform logs and fetches full details only when requested', async () => {
    await render(wrap());
    await expect
      .element(page.getByText('审计测试对象', { exact: true }))
      .toBeVisible();
    expect(getAuditLog).not.toHaveBeenCalled();
    await page.getByRole('button', { name: '详情', exact: true }).click();
    await expect
      .element(page.getByText('request-audit-ui', { exact: true }))
      .toBeVisible();
    await expect.element(page.getByText(/旧名称/)).toBeVisible();
    expect(getAuditLog).toHaveBeenCalledWith('platform', 'operation', '1');
  });

  it('requires explicit confirmation before shortening retention and preserves the version', async () => {
    await render(wrap());
    await page.getByRole('button', { name: '保留策略', exact: true }).click();
    await page.getByLabelText('操作日志保留天数', { exact: true }).fill('30');
    await submit().click();
    await expect
      .element(page.getByText('确认缩短日志保留时间', { exact: true }).last())
      .toBeVisible();
    expect(updateAuditPolicy).not.toHaveBeenCalled();
    await submit().last().click();
    await vi.waitFor(() =>
      expect(updateAuditPolicy).toHaveBeenCalledWith({
        operationDays: 30,
        loginDays: 180,
        revision: 3,
      }),
    );
  });

  it('uses tenant login endpoints and hides platform retention controls', async () => {
    location.pathname = '/tenant/audit/login-logs/';
    await render(wrap());
    await vi.waitFor(() =>
      expect(listAuditLogs).toHaveBeenCalledWith(
        'tenant',
        'login',
        expect.anything(),
      ),
    );
    expect(getAuditPolicy).toHaveBeenCalledWith('tenant');
    await expect
      .element(page.getByRole('button', { name: '保留策略', exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('columnheader', { name: '登录账号' }))
      .toBeVisible();
  });
});
