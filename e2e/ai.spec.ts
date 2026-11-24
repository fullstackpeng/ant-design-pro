import { expect, test } from '@playwright/test';

test('tenant chat persists turns, selects authorized sources and deletes conversations', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const messages: BackendMessage[] = [];
  const asks: Record<string, unknown>[] = [];
  let hasConversation = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    let total = 0;
    if (path === '/api/site-settings')
      data = {
        title: 'AI QA',
        logo: '/logo.svg',
        loginBackground: '',
        footerText: '',
        colorPrimary: '#1677ff',
        defaultLocale: 'zh-CN',
        revision: 0,
      };
    if (path === '/api/currentUser')
      data = {
        userid: '1',
        name: 'AI Tester',
        access: 'admin',
        isPlatformAdmin: false,
        tenant: { id: '1', code: 'qa', name: 'QA' },
      };
    if (path === '/api/current/navigation')
      data = {
        permissions: ['chatbot:view'],
        allowedPaths: ['/chatbot'],
        menus: [],
      };
    if (path === '/api/ai/assistants')
      data = [{ id: '1', name: '系统操作助手' }];
    if (path === '/api/ai/conversations') {
      data = hasConversation
        ? [
            {
              id: '1',
              assistantId: '1',
              title: '新对话',
              updatedAt: new Date().toISOString(),
            },
          ]
        : [];
      total = hasConversation ? 1 : 0;
    }
    if (path === '/api/ai/conversations/1/messages') {
      data = messages;
      total = messages.length;
    }
    if (path === '/api/ai/chat') {
      const body = route.request().postDataJSON();
      asks.push(body);
      hasConversation = true;
      const sources = [
        {
          documentId: '2',
          chunkId: '3',
          version: 1,
          title: '新增成员指南',
          route: null,
        },
      ];
      messages.push({
        id: `${messages.length + 1}`,
        role: 'user',
        content: body.question,
        status: 'completed',
        sources: [],
      });
      messages.push({
        id: `${messages.length + 1}`,
        role: 'assistant',
        content: '打开成员管理，填写账号后保存。',
        status: 'completed',
        sources,
      });
      data = {
        conversationId: '1',
        requestId: 'qa',
        kind: 'direct',
        strategy: body.documentId ? 'selection' : 'exact',
        content: '打开成员管理，填写账号后保存。',
        sources,
      };
    }
    if (
      path === '/api/ai/conversations/1' &&
      route.request().method() === 'DELETE'
    ) {
      hasConversation = false;
      messages.length = 0;
      data = null;
    }
    await route.fulfill({
      json: { success: true, data, total, unreadTotal: 0 },
    });
  });
  await page.goto('/chatbot');
  const sender = page.getByPlaceholder('例如：如何新增成员？');
  await expect(sender).toBeEnabled();
  await sender.fill('如何新增成员');
  await sender.press('Enter');
  await expect(
    page.getByText('打开成员管理，填写账号后保存。', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '新增成员指南', exact: true }).click();
  await expect.poll(() => asks.length).toBe(2);
  expect(asks[1].documentId).toBe('2');
  expect(asks[1].conversationId).toBe('1');
  await page.screenshot({
    path: test.info().outputPath('ai-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sender).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('ai-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: /删\s*除/, exact: true }).click();
  await page.getByRole('button', { name: /确.*定/ }).click();
  await expect(
    page.getByRole('button', { name: '新对话 #1', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('platform AI forms preserve array fields and require confirmation before shortening retention', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  let policy = { conversationRetentionDays: 90, revision: 0 };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === 'POST' || method === 'PATCH')
      writes.push({ path, body: route.request().postDataJSON() });
    let data: unknown = [];
    let total = 0;
    if (path === '/api/site-settings')
      data = {
        title: 'AI QA',
        logo: '/logo.svg',
        loginBackground: '',
        footerText: '',
        colorPrimary: '#1677ff',
        defaultLocale: 'zh-CN',
        revision: 0,
      };
    if (path === '/api/currentUser')
      data = {
        userid: '1',
        name: 'Platform Tester',
        access: 'user',
        isPlatformAdmin: true,
        tenant: null,
      };
    if (path === '/api/current/navigation')
      data = {
        permissions: [],
        allowedPaths: [
          '/platform/ai/knowledge-bases',
          '/platform/ai/documents',
          '/platform/ai/assistants',
          '/platform/ai/policy',
        ],
        menus: [],
      };
    if (path === '/api/platform/ai/options')
      data = {
        permissions: [
          { value: 'members:create', label: '新增成员 (members:create)' },
        ],
        pages: [{ value: 'tenant-members', label: '成员管理' }],
      };
    if (path === '/api/platform/ai/knowledge-bases') {
      data = [
        {
          id: '1',
          code: 'system-guide',
          name: '系统操作指南',
          description: '',
          isActive: true,
          revision: 0,
        },
      ];
      total = 1;
    }
    if (path === '/api/platform/ai/documents' && method === 'GET') {
      data = [
        {
          id: '2',
          knowledgeBaseId: '1',
          title: '测试指南',
          standardQuestions: ['如何新增成员'],
          synonyms: ['添加用户'],
          keywords: ['新增', '成员'],
          content: '测试操作说明',
          steps: ['打开页面', '填写后保存'],
          pageCode: null,
          status: 'draft',
          isPublic: false,
          permissionMode: 'ALL',
          permissions: [],
          version: 1,
          revision: 0,
        },
      ];
      total = 1;
    }
    if (path === '/api/platform/ai/assistants' && method === 'GET') {
      data = [
        {
          id: '1',
          code: 'system-guide',
          name: '系统操作助手',
          isActive: false,
          isPublic: true,
          permissionMode: 'ALL',
          publicationScope: 'none',
          permissions: [],
          tenantIds: [],
          knowledgeBaseIds: ['1'],
          prompt: '',
          retrievalConfig: {
            exact: true,
            keyword: true,
            trigram: false,
            vector: false,
            topK: 4,
          },
          revision: 0,
        },
      ];
      total = 1;
    }
    if (path === '/api/platform/ai/policy') {
      if (method === 'PATCH')
        policy = { ...route.request().postDataJSON(), revision: 1 };
      data = policy;
    }
    await route.fulfill({
      json: { success: true, data, total, unreadTotal: 0 },
    });
  });
  await page.goto('/platform/ai/knowledge-bases');
  await page.getByRole('button', { name: /新\s*增/, exact: true }).click();
  await page.getByLabel('编码', { exact: true }).fill('new-guide');
  await page.getByLabel('名称', { exact: true }).fill('新知识库');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确.*定/ })
    .click();
  await expect
    .poll(() =>
      writes.some((w) => w.path === '/api/platform/ai/knowledge-bases'),
    )
    .toBe(true);
  await page.goto('/platform/ai/documents');
  await page.getByRole('button', { name: /编\s*辑/, exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确.*定/ })
    .click();
  await expect
    .poll(() => writes.some((w) => w.path === '/api/platform/ai/documents/2'))
    .toBe(true);
  const document = writes.find(
    (w) => w.path === '/api/platform/ai/documents/2',
  );
  expect(document?.body.steps).toEqual(['打开页面', '填写后保存']);
  expect(document?.body.standardQuestions).toEqual(['如何新增成员']);
  expect(document?.body.pageCode).toBeUndefined();
  await page.goto('/platform/ai/assistants');
  await page.getByRole('button', { name: /编\s*辑/, exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确.*定/ })
    .click();
  await expect
    .poll(() => writes.some((w) => w.path === '/api/platform/ai/assistants/1'))
    .toBe(true);
  expect(
    writes.find((w) => w.path === '/api/platform/ai/assistants/1')?.body
      .retrievalConfig,
  ).toEqual({
    exact: true,
    keyword: true,
    trigram: false,
    vector: false,
    topK: 4,
  });
  await page.goto('/platform/ai/policy');
  await page.getByLabel('会话保留天数', { exact: true }).fill('30');
  await page.getByRole('button', { name: /提.*交/ }).click();
  await expect(
    page.getByRole('dialog', { name: /确认缩短保留期限/ }),
  ).toBeVisible();
  expect(writes.some((w) => w.path === '/api/platform/ai/policy')).toBe(false);
  await page.getByRole('button', { name: /确.*定/ }).click();
  await expect.poll(() => policy.conversationRetentionDays).toBe(30);
  expect(errors).toEqual([]);
});

interface BackendMessage {
  id: string;
  role: string;
  content: string;
  status: string;
  sources: {
    documentId: string;
    chunkId: string;
    version: number;
    title: string;
    route: string | null;
  }[];
}
