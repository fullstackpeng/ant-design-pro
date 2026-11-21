import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { AppModule } from '../app.module.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';
import { hashPassword } from './password.js';

@Controller('api/test-protected')
class TestProtectedController {
  @Get()
  get() {
    return { success: true };
  }
}

@Module({ imports: [AppModule], controllers: [TestProtectedController] })
class TestModule {}

test('real PostgreSQL authentication lifecycle', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const adminPool = new Pool({ connectionString: originalUrl });
  const schema = `auth_test_${randomBytes(8).toString('hex')}`;
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let baseUrl = '';
  let cookie = '';

  async function start() {
    app = await NestFactory.create(TestModule, {
      logger: false,
      abortOnError: false,
    });
    app.use(cookieParser());
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  }

  async function login(body: unknown) {
    return fetch(`${baseUrl}/api/login/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  async function currentUser(session = cookie) {
    return fetch(`${baseUrl}/api/currentUser`, {
      headers: { Cookie: session },
    });
  }

  const credentials = {
    tenantCode: 'tenant-a',
    username: 'admin',
    password: 'test-password',
    type: 'account',
    autoLogin: true,
  };

  try {
    // Recreate the legacy layout with a live session, then apply the tenant upgrade.
    const legacyUrl = new URL(originalUrl ?? '');
    legacyUrl.searchParams.set('options', `-c search_path=${schema}`);
    const legacy = new Pool({ connectionString: legacyUrl.toString() });
    const legacyToken = randomBytes(32).toString('hex');
    try {
      await legacy.query(
        await readFile(
          resolve('prisma/migrations/0_init/migration.sql'),
          'utf8',
        ),
      );
      const user = await legacy.query(
        'INSERT INTO app_users (username, password_hash, name, access) VALUES ($1, $2, $3, $4) RETURNING id',
        ['admin', await hashPassword(credentials.password), '管理员', 'admin'],
      );
      await legacy.query(
        'INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [
          createHash('sha256').update(legacyToken).digest('hex'),
          user.rows[0].id,
          new Date(Date.now() + 86400000),
        ],
      );
    } finally {
      await legacy.end();
    }
    for (const args of [
      ['migrate', 'resolve', '--applied', '0_init'],
      ['migrate', 'deploy'],
    ]) {
      await promisify(execFile)(
        process.execPath,
        [resolve('node_modules/prisma/build/index.js'), ...args],
        { env: process.env },
      );
    }
    await seedDemoData(prisma, credentials.password);
    await seedDemoData(prisma, 'must-not-reset-existing-password');
    await start();

    await t.test(
      'legacy sessions and users are migrated into tenant-a',
      async () => {
        const response = await currentUser(`antd_session=${legacyToken}`);
        assert.equal(response.status, 200);
        const body = (await response.json()) as {
          data: { access: string; tenant: { code: string } };
        };
        assert.equal(body.data.access, 'admin');
        assert.equal(body.data.tenant.code, 'tenant-a');
      },
    );

    await t.test(
      'memberships are required even with valid credentials',
      async () => {
        for (const [tenantCode, username] of [
          ['tenant-a', 'tenant-b-user'],
          ['tenant-b', 'tenant-a-user'],
        ]) {
          assert.equal(
            (await login({ ...credentials, tenantCode, username })).status,
            401,
          );
        }
      },
    );

    await t.test(
      'session composite foreign key rejects a user outside the tenant',
      async () => {
        const tenant = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-b' },
        });
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: 'tenant-a-user' },
        });
        await assert.rejects(
          prisma.session.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              tokenHash: randomBytes(32).toString('hex'),
              expiresAt: new Date(Date.now() + 60000),
            },
          }),
        );
      },
    );

    await t.test(
      'independent sessions enforce tenant identity and tenant-specific roles',
      async () => {
        const a = await login(credentials);
        const b = await login({ ...credentials, tenantCode: 'tenant-b' });
        const cookieA = (a.headers.get('set-cookie') ?? '').split(';')[0];
        const cookieB = (b.headers.get('set-cookie') ?? '').split(';')[0];
        const dataA = (
          (await (await currentUser(cookieA)).json()) as {
            data: { tenant: { id: string; code: string }; access: string };
          }
        ).data;
        const dataB = (
          (await (await currentUser(cookieB)).json()) as {
            data: { tenant: { id: string; code: string }; access: string };
          }
        ).data;
        assert.equal(dataA.tenant.code, 'tenant-a');
        assert.equal(dataB.tenant.code, 'tenant-b');
        assert.equal(dataA.access, 'admin');
        assert.equal(dataB.access, 'user');
        const forged = await fetch(`${baseUrl}/api/tenant/current`, {
          headers: { Cookie: cookieA, 'X-Tenant-ID': dataB.tenant.id },
        });
        assert.equal(forged.status, 403);
        const same = await fetch(
          `${baseUrl}/api/tenant/current?tenantId=${dataB.tenant.id}`,
          {
            headers: { Cookie: cookieA, 'X-Tenant-ID': dataA.tenant.id },
          },
        );
        assert.equal(same.status, 200);
        assert.equal(
          ((await same.json()) as { data: { code: string } }).data.code,
          'tenant-a',
        );
        assert.equal(
          (
            await fetch(`${baseUrl}/api/test-protected`, {
              headers: { Cookie: cookieA },
            })
          ).status,
          200,
        );
        await fetch(`${baseUrl}/api/login/outLogin`, {
          method: 'POST',
          headers: { Cookie: cookieA },
        });
        assert.equal((await currentUser(cookieA)).status, 401);
        assert.equal((await currentUser(cookieB)).status, 200);
      },
    );

    await t.test(
      'tenant and membership suspension and role changes apply to existing sessions',
      async () => {
        const response = await login(credentials);
        const saved = (response.headers.get('set-cookie') ?? '').split(';')[0];
        const tenant = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-a' },
        });
        const admin = await prisma.user.findUniqueOrThrow({
          where: { username: 'admin' },
        });
        const where = {
          tenantId_userId: { tenantId: tenant.id, userId: admin.id },
        };
        try {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { isActive: false },
          });
          assert.equal((await currentUser(saved)).status, 401);
          assert.equal((await login(credentials)).status, 401);
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { isActive: true },
          });
          await prisma.tenantMembership.update({
            where,
            data: { isActive: false },
          });
          assert.equal((await currentUser(saved)).status, 401);
          assert.equal((await login(credentials)).status, 401);
          await prisma.tenantMembership.update({
            where,
            data: { isActive: true, role: 'user' },
          });
          assert.equal(
            (
              (await (await currentUser(saved)).json()) as {
                data: { access: string };
              }
            ).data.access,
            'user',
          );
          await seedDemoData(prisma, 'must-not-reset-existing-password');
          const membership = await prisma.tenantMembership.findUniqueOrThrow({
            where,
          });
          assert.equal(membership.role, 'user');
        } finally {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { isActive: true },
          });
          await prisma.tenantMembership.update({
            where,
            data: { isActive: true, role: 'admin' },
          });
        }
      },
    );

    await t.test(
      'deleting membership revokes its sessions without affecting another tenant',
      async () => {
        const a = await login({ ...credentials, username: 'tenant-a-user' });
        const b = await login({
          ...credentials,
          username: 'tenant-b-user',
          tenantCode: 'tenant-b',
        });
        const aCookie = (a.headers.get('set-cookie') ?? '').split(';')[0];
        const bCookie = (b.headers.get('set-cookie') ?? '').split(';')[0];
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: 'tenant-a-user' },
        });
        await prisma.tenantMembership.deleteMany({
          where: { userId: user.id },
        });
        assert.equal((await currentUser(aCookie)).status, 401);
        assert.equal((await currentUser(bCookie)).status, 200);
      },
    );

    await t.test(
      'hello remains public; current user requires a valid session',
      async () => {
        const hello = await fetch(`${baseUrl}/api/hello`);
        assert.equal(hello.status, 200);
        assert.deepEqual(await hello.json(), {
          success: true,
          data: { message: 'Hello World!' },
        });
        assert.equal((await currentUser()).status, 401);
        assert.equal(
          (await fetch(`${baseUrl}/api/test-protected`)).status,
          401,
        );
        assert.equal((await currentUser('antd_session=invalid')).status, 401);
      },
    );

    await t.test(
      'public tenant lookup returns only active tenants and minimal fields',
      async () => {
        const response = await fetch(`${baseUrl}/api/login/tenants`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const body = (await response.json()) as {
          success: boolean;
          data: { code: string; name: string }[];
        };
        assert.equal(body.success, true);
        assert.deepEqual(
          body.data.map((tenant) => tenant.code),
          ['tenant-a', 'tenant-b'],
        );
        assert.deepEqual(Object.keys(body.data[0]).sort(), ['code', 'name']);

        const filtered = (await (
          await fetch(`${baseUrl}/api/login/tenants?keyword=tenant-b`)
        ).json()) as typeof body;
        assert.deepEqual(filtered.data, [
          { code: 'tenant-b', name: '示例企业 B' },
        ]);

        const byName = (await (
          await fetch(
            `${baseUrl}/api/login/tenants?keyword=${encodeURIComponent('示例企业 B')}`,
          )
        ).json()) as typeof body;
        assert.deepEqual(byName.data, [
          { code: 'tenant-b', name: '示例企业 B' },
        ]);

        const tenant = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-b' },
        });
        try {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { isActive: false },
          });
          const disabled = (await (
            await fetch(`${baseUrl}/api/login/tenants?keyword=tenant-b`)
          ).json()) as typeof body;
          assert.deepEqual(disabled.data, []);
        } finally {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { isActive: true },
          });
        }

        assert.equal(
          (await fetch(`${baseUrl}/api/login/tenants?limit=51`)).status,
          400,
        );
      },
    );

    await t.test(
      'rejects malformed input, unsupported login types and incorrect credentials',
      async () => {
        for (const body of [
          null,
          {},
          { username: ['admin'], password: 'test' },
          { ...credentials, type: 'mobile' },
          { ...credentials, autoLogin: 'true' },
          { ...credentials, tenantCode: undefined },
          { ...credentials, tenantCode: ['tenant-a'] },
          { ...credentials, tenantCode: '../tenant-b' },
        ]) {
          assert.equal((await login(body)).status, 400);
        }
        for (const body of [
          { ...credentials, password: 'wrong' },
          { ...credentials, username: "admin' OR '1'='1" },
          { ...credentials, tenantCode: 'unknown-tenant' },
          { ...credentials, tenantCode: 'tenant-b', username: 'tenant-a-user' },
        ]) {
          const result = await login(body);
          assert.equal(result.status, 401);
          assert.equal(result.headers.get('set-cookie'), null);
        }
      },
    );

    await t.test(
      'sets an HttpOnly cookie and returns only public user fields',
      async () => {
        const result = await login(credentials);
        assert.equal(result.status, 200);
        assert.deepEqual(await result.json(), { success: true, data: null });
        const setCookie = result.headers.get('set-cookie') ?? '';
        assert.match(setCookie, /HttpOnly/);
        assert.match(setCookie, /SameSite=Strict/);
        assert.match(setCookie, /Path=\/api/);
        assert.match(setCookie, /Max-Age=604800/);
        cookie = setCookie.split(';')[0];
        const current = await currentUser();
        assert.equal(current.status, 200);
        assert.equal(current.headers.get('cache-control'), 'no-store');
        const body = (await current.json()) as {
          success: boolean;
          data: Record<string, unknown>;
        };
        assert.equal(body.success, true);
        assert.equal(body.data.access, 'admin');
        assert.equal(body.data.name, '管理员');
        assert.equal(typeof body.data.userid, 'string');
        assert.deepEqual(Object.keys(body.data).sort(), [
          'access',
          'isPlatformAdmin',
          'name',
          'tenant',
          'userid',
        ]);
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: 'admin' },
        });
        assert.notEqual(user.passwordHash, credentials.password);
        const token = cookie.split('=')[1];
        const session = await prisma.session.findUniqueOrThrow({
          where: {
            tokenHash: createHash('sha256').update(token).digest('hex'),
          },
        });
        assert.notEqual(session.tokenHash, token);
        assert.equal(
          session.tokenHash,
          createHash('sha256').update(token).digest('hex'),
        );
      },
    );

    await t.test(
      'successful re-login rotates the current session',
      async () => {
        const oldCookie = cookie;
        const result = await login(credentials);
        cookie = (result.headers.get('set-cookie') ?? '').split(';')[0];
        assert.notEqual(cookie, oldCookie);
        assert.equal((await currentUser(oldCookie)).status, 401);
        assert.equal((await currentUser()).status, 200);
      },
    );

    await t.test('sessions survive application restart', async () => {
      await app?.close();
      await start();
      assert.equal((await currentUser()).status, 200);
    });

    await t.test(
      'logout clears the cookie and revokes the server session',
      async () => {
        const result = await fetch(`${baseUrl}/api/login/outLogin`, {
          method: 'POST',
          headers: { Cookie: cookie },
        });
        assert.equal(result.status, 200);
        assert.match(
          result.headers.get('set-cookie') ?? '',
          /Expires=Thu, 01 Jan 1970/,
        );
        assert.equal((await currentUser()).status, 401);
        assert.equal(
          (await fetch(`${baseUrl}/api/login/outLogin`, { method: 'POST' }))
            .status,
          200,
        );
      },
    );

    await t.test(
      'session cookies without remember-me expire server-side',
      async () => {
        cookie = '';
        const result = await login({ ...credentials, autoLogin: false });
        assert.equal(result.status, 200);
        assert.doesNotMatch(result.headers.get('set-cookie') ?? '', /Max-Age=/);
        cookie = (result.headers.get('set-cookie') ?? '').split(';')[0];
        assert.equal((await currentUser()).status, 200);
        await prisma.session.updateMany({
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        assert.equal((await currentUser()).status, 401);
      },
    );
  } finally {
    await app?.close();
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
    await adminPool.end();
  }
});
