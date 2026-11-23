import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { AppModule } from '../app.module.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';

interface NotificationPayload {
  id: string;
  source: string;
  type: string;
  title: string;
  contentHtml: string;
  isActive: boolean;
  publishAt: string | null;
  expireAt: string | null;
  readAt: string | null;
  targetTenantIds: string[];
  targetUserIds: string[];
  creatorName: string;
}

test('notifications: dual source isolation, targeting, read state and sanitization', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `notification_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'notification-test-password';

  async function api(
    path: string,
    cookie = '',
    method = 'GET',
    body?: unknown,
  ) {
    return fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  async function login(tenantCode: string, username: string) {
    const response = await fetch(`${base}/api/login/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantCode, username, password }),
    });
    assert.equal(response.status, 200);
    return (response.headers.get('set-cookie') ?? '').split(';')[0];
  }

  async function create(
    path: string,
    cookie: string,
    body: Record<string, unknown>,
  ) {
    const response = await api(path, cookie, 'POST', body);
    const error = response.ok ? '' : await response.clone().text();
    assert.equal(response.status, 201, error);
    return response.json();
  }

  async function inbox(cookie: string, query = '') {
    const response = await api(`/api/message-center/inbox${query}`, cookie);
    assert.equal(response.status, 200);
    return (await response.json()) as {
      data: NotificationPayload[];
      total: number;
      unreadTotal: number;
    };
  }

  try {
    const client = await admin.connect();
    try {
      await client.query(`SET search_path TO ${schema}`);
      const migrations = await readdir(resolve('prisma/migrations'), {
        withFileTypes: true,
      });
      for (const migration of migrations
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        await client.query(
          await readFile(
            resolve('prisma/migrations', migration.name, 'migration.sql'),
            'utf8',
          ),
        );
      }
    } finally {
      await client.query('RESET search_path');
      client.release();
    }
    await seedDemoData(prisma, password);
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    app.useWebSocketAdapter(new WsAdapter(app));
    app.use(cookieParser());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();

    const platform = await login('platform', 'platform-admin');
    const adminA = await login('tenant-a', 'admin');
    const userA = await login('tenant-a', 'tenant-a-user');
    const adminB = await login('tenant-b', 'tenant-b-user');
    const tenantA = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-a' },
    });
    const tenantB = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-b' },
    });
    const userARow = await prisma.user.findUniqueOrThrow({
      where: { username: 'tenant-a-user' },
    });

    let platformNoticeId = '';
    let tenantNoticeId = '';

    await t.test(
      'platform and tenant writes are isolated by source',
      async () => {
        assert.equal(
          (await api('/api/platform/notifications', adminA, 'POST', {})).status,
          403,
        );
        assert.equal(
          (await api('/api/tenant/notifications', platform, 'POST', {})).status,
          403,
        );
        assert.equal(
          (await api('/api/tenant/notifications', userA, 'POST', {})).status,
          403,
        );

        const platformAnnouncement = await create(
          '/api/platform/notifications',
          platform,
          {
            type: 'announcement',
            title: '平台公告',
            contentHtml: '<p>全员内容</p>',
            isActive: true,
          },
        );
        assert.equal(platformAnnouncement.success, true);

        const createdNotice = await create(
          '/api/platform/notifications',
          platform,
          {
            type: 'notice',
            title: '平台定向通知',
            contentHtml:
              '<p onclick="alert(1)" style="text-align:center;background:url(javascript:alert(2))">A 租户专属<script>alert(3)</script></p>',
            isActive: true,
            targetTenantIds: [tenantA.id.toString()],
          },
        );
        assert.equal(createdNotice.success, true);
        const list = (await api('/api/platform/notifications', platform).then(
          (response) => response.json(),
        )) as { data: NotificationPayload[] };
        const platformNotice = list.data.find(
          (item) => item.title === '平台定向通知',
        );
        assert.ok(platformNotice);
        platformNoticeId = platformNotice.id;
        const detail = (await api(
          `/api/platform/notifications/${platformNoticeId}`,
          platform,
        ).then((response) => response.json())) as {
          data: NotificationPayload;
        };
        assert.deepEqual(detail.data.targetTenantIds, [tenantA.id.toString()]);
        assert.ok(!detail.data.targetTenantIds.includes(tenantB.id.toString()));
        assert.ok(!detail.data.contentHtml.includes('onclick'));
        assert.ok(!detail.data.contentHtml.includes('<script'));
        assert.ok(!detail.data.contentHtml.includes('javascript:'));
        assert.ok(detail.data.contentHtml.includes('text-align:center'));

        const tenantAnnouncement = await create(
          '/api/tenant/notifications',
          adminA,
          {
            type: 'announcement',
            title: '租户公告',
            contentHtml: '<p>本租户内容</p>',
            isActive: true,
          },
        );
        assert.equal(tenantAnnouncement.success, true);

        const tenantNotice = await create('/api/tenant/notifications', adminA, {
          type: 'notice',
          title: '租户定向通知',
          contentHtml: '<p>指定成员</p>',
          isActive: true,
          targetUserIds: [userARow.id.toString()],
        });
        assert.equal(tenantNotice.success, true);
        const tenantList = (await api('/api/tenant/notifications', adminA).then(
          (response) => response.json(),
        )) as { data: NotificationPayload[] };
        const tenantNoticeRow = tenantList.data.find(
          (item) => item.title === '租户定向通知',
        );
        assert.ok(tenantNoticeRow);
        tenantNoticeId = tenantNoticeRow.id;
        assert.ok(tenantList.data.every((item) => item.source === 'tenant'));

        const body = {
          type: 'announcement',
          title: '越权修改',
          contentHtml: '<p>x</p>',
          isActive: true,
        };
        assert.equal(
          (
            await api(
              `/api/platform/notifications/${platformNoticeId}`,
              adminA,
              'PATCH',
              body,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await api(
              `/api/platform/notifications/${platformNoticeId}`,
              adminB,
              'DELETE',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await api(
              `/api/tenant/notifications/${tenantNoticeId}`,
              adminB,
              'PATCH',
              body,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await api(
              `/api/tenant/notifications/${tenantNoticeId}`,
              adminB,
              'DELETE',
            )
          ).status,
          404,
        );
        assert.equal((await api('/api/notification-assets/1')).status, 401);
      },
    );

    await t.test(
      'notification assets are readable by both scopes',
      async () => {
        // 不存在的文件应由 FilesService 返回 404，而不是被会话守卫按租户作用域拦截为 403。
        const missingAsset = '/api/notification-assets/999999999';
        assert.equal((await api(missingAsset, platform)).status, 404);
        assert.equal((await api(missingAsset, adminA)).status, 404);
        assert.equal((await api(missingAsset, adminB)).status, 404);
      },
    );

    await t.test(
      'inbox merges visible messages and tracks read state',
      async () => {
        const initial = await inbox(userA);
        const titles = initial.data.map((item) => item.title);
        assert.ok(titles.includes('平台公告'));
        assert.ok(titles.includes('平台定向通知'));
        assert.ok(titles.includes('租户公告'));
        assert.ok(titles.includes('租户定向通知'));
        assert.equal(initial.unreadTotal, 4);

        const tenantBInbox = await inbox(adminB);
        const tenantBTitles = tenantBInbox.data.map((item) => item.title);
        assert.ok(tenantBTitles.includes('平台公告'));
        assert.ok(!tenantBTitles.includes('平台定向通知'));
        assert.ok(!tenantBTitles.includes('租户公告'));
        assert.ok(!tenantBTitles.includes('租户定向通知'));

        const unread = await inbox(userA, '?status=unread');
        assert.equal(unread.total, 4);
        const readResponse = await api(
          `/api/message-center/inbox/${platformNoticeId}/read`,
          userA,
          'POST',
        );
        assert.equal(readResponse.status, 200);
        const afterRead = await inbox(userA);
        assert.equal(afterRead.unreadTotal, 3);
        const readNotice = afterRead.data.find(
          (item) => item.id === platformNoticeId,
        );
        assert.ok(readNotice);
        assert.notEqual(readNotice.readAt, null);

        const tenantBRead = await api(
          `/api/message-center/inbox/${platformNoticeId}/read`,
          adminB,
          'POST',
        );
        assert.equal(tenantBRead.status, 404);

        const readAll = await api(
          '/api/message-center/inbox/read-all',
          userA,
          'POST',
        );
        assert.equal(readAll.status, 200);
        assert.equal((await inbox(userA)).unreadTotal, 0);
        assert.equal((await inbox(userA, '?status=read')).total, 4);
      },
    );
  } finally {
    await app?.close();
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
