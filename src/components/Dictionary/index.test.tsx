import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { getDictionary } from '@/services/dictionaries';
import { DictionarySelect, DictionaryText } from './index';

const state = vi.hoisted(() => ({ tenantId: '1', userId: '10' }));
vi.mock('@umijs/max', () => ({
  useModel: () => ({
    initialState: {
      currentUser: { userid: state.userId, tenant: { id: state.tenantId } },
    },
  }),
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) =>
      defaultMessage,
  }),
}));
vi.mock('@/services/dictionaries', () => ({
  getDictionary: vi.fn(),
  dictionaryQueryKey: (tenant: string, user: string, code: string) => [
    'dictionaries',
    tenant,
    user,
    code,
  ],
}));

const dictionary: BackendAPI.DictionaryDetailDto = {
  code: 'source',
  name: '来源',
  remark: '',
  isActive: true,
  items: [
    {
      id: '1',
      value: 'web',
      label: '官网',
      sortOrder: 0,
      isActive: true,
      color: 'blue',
    },
    {
      id: '2',
      value: 'old',
      label: '展会',
      sortOrder: 10,
      isActive: false,
      color: '',
    },
  ],
};

describe('dictionary fields', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    state.tenantId = '1';
    state.userId = '10';
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(getDictionary).mockResolvedValue({
      success: true,
      data: dictionary,
    });
  });

  it('renders inactive historical labels and falls back to unknown stored values', async () => {
    const screen = await render(
      <QueryClientProvider client={client}>
        <DictionaryText dictionaryCode="source" value={['old', 'missing']} />
      </QueryClientProvider>,
    );
    await expect.element(screen.getByText('展会')).toBeVisible();
    await expect.element(screen.getByText('missing')).toBeVisible();
  });

  it('offers active values and retains an inactive selected value as disabled', async () => {
    await render(
      <QueryClientProvider client={client}>
        <DictionarySelect dictionaryCode="source" value="old" open />
      </QueryClientProvider>,
    );
    await vi.waitFor(() => {
      expect(document.querySelector('[title="官网"]')).not.toBeNull();
      expect(
        document.querySelector(
          '.ant-select-item-option-disabled[title="展会 (已停用)"]',
        ),
      ).not.toBeNull();
    });
  });

  it('does not offer inactive unselected values or values from an inactive type', async () => {
    vi.mocked(getDictionary).mockResolvedValue({
      success: true,
      data: { ...dictionary, isActive: false },
    });
    const screen = await render(
      <QueryClientProvider client={client}>
        <DictionarySelect dictionaryCode="source" open />
      </QueryClientProvider>,
    );
    await expect.element(screen.getByText('暂无可用选项')).toBeVisible();
    expect(document.querySelector('[title="官网"]')).toBeNull();
    expect(document.querySelector('[title="展会"]')).toBeNull();
  });

  it('keeps cached labels separate between tenants and users', async () => {
    const screen = await render(
      <QueryClientProvider client={client}>
        <DictionaryText dictionaryCode="source" value="web" />
      </QueryClientProvider>,
    );
    await expect.element(screen.getByText('官网')).toBeVisible();
    state.tenantId = '2';
    state.userId = '20';
    vi.mocked(getDictionary).mockResolvedValue({
      success: true,
      data: {
        ...dictionary,
        items: [{ ...dictionary.items[0], label: 'B 企业官网' }],
      },
    });
    await screen.rerender(
      <QueryClientProvider client={client}>
        <DictionaryText dictionaryCode="source" value="web" />
      </QueryClientProvider>,
    );
    await expect.element(screen.getByText('B 企业官网')).toBeVisible();
    expect(client.getQueryData(['dictionaries', '1', '10', 'source'])).toEqual(
      dictionary,
    );
    expect(getDictionary).toHaveBeenCalledTimes(2);
  });

  it('shows request failure and allows retry without offering stale options', async () => {
    vi.mocked(getDictionary)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ success: true, data: dictionary });
    const screen = await render(
      <QueryClientProvider client={client}>
        <DictionarySelect dictionaryCode="source" />
      </QueryClientProvider>,
    );
    await expect.element(screen.getByText('字典加载失败')).toBeVisible();
    await screen.getByRole('button', { name: /重\s*试/ }).click();
    await vi.waitFor(() => expect(getDictionary).toHaveBeenCalledTimes(2));
    await expect.element(screen.getByRole('combobox')).toBeEnabled();
  });
});
