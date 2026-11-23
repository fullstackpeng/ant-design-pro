import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  changeAccountPassword,
  revokeOtherAccountSessions,
  updateAccountProfile,
  uploadAccountAvatar,
} from '../../service';
import BaseView from './base';
import SecurityView from './security';

const mocks = vi.hoisted(() => ({
  setInitialState: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@umijs/max', () => ({
  useModel: () => ({ setInitialState: mocks.setInitialState }),
  history: { replace: mocks.replace },
}));
vi.mock('../../service', () => ({
  updateAccountProfile: vi.fn(),
  uploadAccountAvatar: vi.fn(),
  removeAccountAvatar: vi.fn(),
  changeAccountPassword: vi.fn(),
  revokeOtherAccountSessions: vi.fn(),
}));

const t = (_id: string, fallback: string) => fallback;
const profile: BackendAPI.AccountProfileDto = {
  userId: '1',
  username: 'alice',
  name: 'Alice',
  avatar: null,
  tenant: null,
  isPlatformAdmin: true,
};
const report = vi.fn();
const refresh = vi.fn();
const wrap = (children: React.ReactNode, client = new QueryClient()) => (
  <QueryClientProvider client={client}>
    <ConfigProvider locale={zhCN}>
      <App>{children}</App>
    </ConfigProvider>
  </QueryClientProvider>
);

describe('personal account forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refresh.mockResolvedValue(undefined);
    vi.mocked(updateAccountProfile).mockResolvedValue({
      success: true,
      data: null,
    });
    vi.mocked(changeAccountPassword).mockResolvedValue({
      success: true,
      data: null,
    });
    vi.mocked(revokeOtherAccountSessions).mockResolvedValue({
      success: true,
      data: null,
    });
  });

  it('saves a display name through the backend and refreshes shared profile state', async () => {
    await render(
      wrap(
        <BaseView profile={profile} refresh={refresh} report={report} t={t} />,
      ),
    );
    await expect
      .element(page.getByText('alice', { exact: true }))
      .toBeVisible();
    await page
      .getByLabelText('显示名称', { exact: true })
      .fill('Alice Updated');
    await page.getByRole('button', { name: '保存资料' }).click();
    await expect
      .poll(() => updateAccountProfile)
      .toHaveBeenCalledWith({ name: 'Alice Updated' });
    await expect.poll(() => refresh).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();
  });

  it('does not pretend a failed profile update was saved', async () => {
    const error = new Error('request failed');
    vi.mocked(updateAccountProfile).mockRejectedValue(error);
    await render(
      wrap(
        <BaseView profile={profile} refresh={refresh} report={report} t={t} />,
      ),
    );
    await page.getByLabelText('显示名称', { exact: true }).fill('Unsaved');
    await page.getByRole('button', { name: '保存资料' }).click();
    await expect.poll(() => report).toHaveBeenCalledWith(error);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('rejects empty display names before sending a request', async () => {
    await render(
      wrap(
        <BaseView profile={profile} refresh={refresh} report={report} t={t} />,
      ),
    );
    await page.getByLabelText('显示名称', { exact: true }).fill('   ');
    await page.getByRole('button', { name: '保存资料' }).click();
    await expect.element(page.getByText('请输入显示名称')).toBeVisible();
    expect(updateAccountProfile).not.toHaveBeenCalled();
    expect(uploadAccountAvatar).not.toHaveBeenCalled();
  });

  it('requires matching password confirmation and clears session state only after success', async () => {
    const client = new QueryClient();
    client.setQueryData(['private-data'], { name: 'Alice' });
    window.sessionStorage.setItem('tenantId', '1');
    await render(wrap(<SecurityView report={report} t={t} />, client));
    await page.getByLabelText('当前密码', { exact: true }).fill('old-password');
    await page.getByLabelText('新密码', { exact: true }).fill('new-password');
    await page
      .getByLabelText('确认新密码', { exact: true })
      .fill('different-password');
    await page.getByRole('button', { name: '修改密码' }).click();
    await expect
      .element(page.getByText('两次输入的新密码不一致'))
      .toBeVisible();
    expect(changeAccountPassword).not.toHaveBeenCalled();
    await page
      .getByLabelText('确认新密码', { exact: true })
      .fill('new-password');
    await page.getByRole('button', { name: '修改密码' }).click();
    await expect
      .poll(() => changeAccountPassword)
      .toHaveBeenCalledWith({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });
    await expect.poll(() => mocks.replace).toHaveBeenCalledWith('/user/login');
    expect(client.getQueryData(['private-data'])).toBeUndefined();
    expect(window.sessionStorage.getItem('tenantId')).toBeNull();
    expect(mocks.setInitialState).toHaveBeenCalledOnce();
  });

  it('preserves login state when the backend rejects the current password', async () => {
    const error = new Error('wrong password');
    vi.mocked(changeAccountPassword).mockRejectedValue(error);
    await render(wrap(<SecurityView report={report} t={t} />));
    await page
      .getByLabelText('当前密码', { exact: true })
      .fill('wrong-password');
    await page.getByLabelText('新密码', { exact: true }).fill('new-password');
    await page
      .getByLabelText('确认新密码', { exact: true })
      .fill('new-password');
    await page.getByRole('button', { name: '修改密码' }).click();
    await expect.poll(() => report).toHaveBeenCalledWith(error);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.setInitialState).not.toHaveBeenCalled();
  });

  it('revokes other logins only after confirmation and keeps current login', async () => {
    await render(wrap(<SecurityView report={report} t={t} />));
    await page.getByRole('button', { name: '退出其他登录' }).click();
    expect(revokeOtherAccountSessions).not.toHaveBeenCalled();
    await page.getByRole('button', { name: /确\s*定/ }).click();
    await expect.poll(() => revokeOtherAccountSessions).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.setInitialState).not.toHaveBeenCalled();
  });
});
