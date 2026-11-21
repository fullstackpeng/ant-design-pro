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
import { WebSocket } from 'ws';
import { AppModule } from '../app.module.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';

type Frame = Record<string, unknown>;

function openSocket(
  url: string,
  headers: Record<string, string> = {},
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers });
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function nextFrame(socket: WebSocket, timeoutMs = 2000): Promise<Frame> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for a WebSocket frame'));
    }, timeoutMs);
    const onMessage = (data: unknown) => {
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(JSON.parse(String(data)) as Frame);
    };
    socket.on('message', onMessage);
  });
}

function expectNoFrame(socket: WebSocket, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    let received = false;
    const onMessage = () => {
      received = true;
    };
    socket.on('message', onMessage);
    setTimeout(() => {
      socket.off('message', onMessage);
      resolve(!received);
    }, timeoutMs);
  });
}

test('authenticated realtime test channel', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `realtime_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  let wsUrl = '';
  const password = 'test-password';

  async function call(
    path: string,
    cookie = '',
    method = 'GET',
    body?: unknown,
  ) {
    return fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function login(tenantCode: string, username: string) {
    const result = await call('/api/login/account', '', 'POST', {
      tenantCode,
      username,
      password,
    });
    assert.equal(result.status, 200);
    return (result.headers.get('set-cookie') ?? '').split(';')[0];
  }

  try {
    const migrationClient = await admin.connect();
    try {
      await migrationClient.query(`SET search_path TO ${schema}`);
      const migrations = await readdir(resolve('prisma/migrations'), {
        withFileTypes: true,
      });
      for (const migration of migrations
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        await migrationClient.query(
          await readFile(
            resolve('prisma/migrations', migration.name, 'migration.sql'),
            'utf8',
          ),
        );
      }
    } finally {
      await migrationClient.query('RESET search_path');
      migrationClient.release();
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
    wsUrl = `${base.replace(/^http/, 'ws')}/api/ws`;

    const tenantA = await login('tenant-a', 'admin');
    const tenantB = await login('tenant-b', 'tenant-b-user');
    const platform = await login('platform', 'platform-admin');

    await t.test('rejects connections without a valid session', async () => {
      const closed = new Promise<number>((resolve, reject) => {
        const socket = new WebSocket(wsUrl);
        socket.on('close', (code) => resolve(code));
        socket.on('error', () => undefined);
        setTimeout(() => reject(new Error('close timeout')), 3000);
      });
      assert.equal(await closed, 4401);
    });

    await t.test('authenticates by cookie and answers ping/echo', async () => {
      const socket = await openSocket(wsUrl, { Cookie: tenantA });
      try {
        const welcome = await nextFrame(socket);
        assert.equal(welcome.type, 'welcome');
        assert.deepEqual(welcome.tenant, {
          code: 'tenant-a',
          name: '示例企业 A',
        });
        socket.send(JSON.stringify({ type: 'ping' }));
        assert.equal((await nextFrame(socket)).type, 'pong');
        socket.send(JSON.stringify({ type: 'echo', text: 'hello' }));
        const echo = await nextFrame(socket);
        assert.equal(echo.type, 'echo');
        assert.equal(echo.text, 'hello');
        socket.send(JSON.stringify({ type: 'echo', text: ' ' }));
        assert.equal((await nextFrame(socket)).type, 'error');
        socket.send('not json');
        assert.equal((await nextFrame(socket)).type, 'error');
      } finally {
        socket.close();
      }
    });

    await t.test(
      'buffers frames sent before authentication completes',
      async () => {
        const socket = await openSocket(wsUrl, { Cookie: tenantA });
        const frames: Frame[] = [];
        socket.on('message', (data) => {
          frames.push(JSON.parse(String(data)) as Frame);
        });
        try {
          socket.send(JSON.stringify({ type: 'ping' }));
          const deadline = Date.now() + 3000;
          while (frames.length < 2 && Date.now() < deadline)
            await new Promise((resolveWait) => setTimeout(resolveWait, 50));
          assert.deepEqual(
            frames.map((frame) => frame.type),
            ['welcome', 'pong'],
          );
        } finally {
          socket.close();
        }
      },
    );

    await t.test('broadcasts only within the same tenant', async () => {
      const a = await openSocket(wsUrl, { Cookie: tenantA });
      assert.equal((await nextFrame(a)).type, 'welcome');
      const b = await openSocket(wsUrl, { Cookie: tenantB });
      try {
        assert.equal((await nextFrame(b)).type, 'welcome');
        a.send(JSON.stringify({ type: 'broadcast', text: 'tenant-a-only' }));
        const received = await nextFrame(a);
        assert.equal(received.type, 'broadcast');
        assert.equal(received.text, 'tenant-a-only');
        assert.equal(received.tenantCode, 'tenant-a');
        assert.equal(await expectNoFrame(b), true);
      } finally {
        a.close();
        b.close();
      }
    });

    await t.test('accepts a bearer token for external tools', async () => {
      const token = platform.split('=').slice(1).join('=');
      const socket = await openSocket(wsUrl, {
        Authorization: `Bearer ${token}`,
      });
      try {
        const welcome = await nextFrame(socket);
        assert.equal(welcome.type, 'welcome');
        assert.equal(welcome.tenant, null);
        assert.equal(
          (welcome.user as { isPlatformAdmin: boolean }).isPlatformAdmin,
          true,
        );
      } finally {
        socket.close();
      }
    });
  } finally {
    await app?.close();
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
