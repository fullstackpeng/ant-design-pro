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

test('platform, tenant members and manual subscriptions', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `management_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'test-password';
  const future = new Date(Date.now() + 86400000).toISOString();

  async function call(
    path: string,
    cookie = '',
    method = 'GET',
    body?: unknown,
    headers = {},
  ) {
    return fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        ...headers,
      },
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
  async function data(response: Response) {
    const result = (await response.json()) as { data: any; total: number };
    return result.data;
  }
  try {
    // Apply the real migration SQL inside the isolated test schema.
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
    const platform = await login('platform', 'platform-admin');
    const tenantA = await login('tenant-a', 'admin');
    const tenantB = await login('tenant-b', 'tenant-b-user');
    const member = await login('tenant-a', 'tenant-a-user');

    await t.test(
      'site settings are public by whitelist, platform-only to edit, versioned and audited',
      async () => {
        const initial = await data(
          await call('/api/platform/settings', platform),
        );
        const exposed = await data(await call('/api/site-settings'));
        assert.deepEqual(
          Object.keys(exposed).sort(),
          [
            'title',
            'logo',
            'loginBackground',
            'footerText',
            'colorPrimary',
            'defaultLocale',
          ].sort(),
        );
        assert.equal(exposed.title, initial.title);
        assert.equal((await call('/api/platform/settings')).status, 401);
        for (const cookie of [tenantA, member]) {
          assert.equal(
            (await call('/api/platform/settings', cookie)).status,
            403,
          );
          assert.equal(
            (await call('/api/platform/settings', cookie, 'PATCH', initial))
              .status,
            403,
          );
          assert.equal(
            (await call('/api/platform/settings/history', cookie)).status,
            403,
          );
        }
        const invalid = [
          { title: ' ' },
          { title: 123 },
          { colorPrimary: 'red' },
          { defaultLocale: 'xx-XX' },
          { revision: '0' },
          { logo: 'javascript:alert(1)' },
          { logo: 'data:image/svg+xml,test' },
          { logo: '//example.com/logo.png' },
          { logo: 'https://user:password@example.com/logo.png' },
          { logo: '/foo\nbar' },
          { loginBackground: 'ftp://example.com/background.png' },
          { loginBackground: null },
        ];
        for (const fields of invalid)
          assert.equal(
            (
              await call('/api/platform/settings', platform, 'PATCH', {
                ...initial,
                ...fields,
              })
            ).status,
            400,
            JSON.stringify(fields),
          );
        assert.equal(
          (await data(await call('/api/platform/settings', platform))).revision,
          initial.revision,
        );
        assert.equal(
          (await data(await call('/api/platform/settings/history', platform)))
            .length,
          0,
        );
        const changed = {
          ...initial,
          title: 'Customer portal',
          logo: '/logo.svg',
          loginBackground: '',
          footerText: 'Example company',
          colorPrimary: '#123456',
          defaultLocale: 'en-US',
        };
        const result = await call('/api/platform/settings', platform, 'PATCH', {
          ...changed,
          DATABASE_URL: 'must-not-be-stored',
          isPlatformAdmin: true,
        });
        assert.equal(result.status, 200);
        const saved = await data(result);
        assert.equal(saved.revision, initial.revision + 1);
        assert.equal(
          (await data(await call('/api/site-settings'))).title,
          changed.title,
        );
        const log = await data(
          await call('/api/platform/settings/history', platform),
        );
        assert.equal(log.length, 1);
        assert.deepEqual(log[0].before, initial);
        assert.deepEqual(log[0].after, saved);
        const actor = await data(await call('/api/currentUser', platform));
        assert.equal(log[0].actorId, actor.userid);
        assert.equal(log[0].actorName, actor.name);
        assert(!JSON.stringify(log).includes('must-not-be-stored'));
        assert.equal(
          (await call('/api/platform/settings', platform, 'PATCH', changed))
            .status,
          409,
        );
        const concurrent = await Promise.all([
          call('/api/platform/settings', platform, 'PATCH', {
            ...saved,
            title: 'First editor',
          }),
          call('/api/platform/settings', platform, 'PATCH', {
            ...saved,
            title: 'Second editor',
          }),
        ]);
        assert.deepEqual(
          concurrent.map((response) => response.status).sort(),
          [200, 409],
        );
        const current = await data(
          await call('/api/platform/settings', platform),
        );
        assert.equal(current.revision, saved.revision + 1);
        assert.equal(
          (await data(await call('/api/platform/settings/history', platform)))
            .length,
          2,
        );
        assert.equal(
          (
            await call('/api/platform/settings', platform, 'PATCH', {
              ...initial,
              revision: current.revision,
            })
          ).status,
          200,
        );
      },
    );

    await t.test(
      'role permissions are tenant scoped, granular and live',
      async () => {
        const a = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-a' },
        });
        const b = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-b' },
        });
        const person = await prisma.user.findUniqueOrThrow({
          where: { username: 'tenant-a-user' },
        });
        const owner = await prisma.user.findUniqueOrThrow({
          where: { username: 'admin' },
        });
        const nav = await data(await call('/api/current/navigation', tenantA));
        assert(
          !nav.menus.some(
            (m: any) => m.code === 'account' || m.path?.startsWith('/account/'),
          ),
        );
        assert(nav.allowedPaths.includes('/account/center'));
        assert(nav.allowedPaths.includes('/account/settings'));
        assert(
          nav.menus.find((m: any) => m.code === 'dashboard-analysis')
            .i18nKey === 'menu.dashboard.analysis',
        );
        assert.equal((await call('/api/tenant/roles', member)).status, 403);
        assert.equal((await call('/api/tenant/roles', platform)).status, 403);
        for (const permissions of [
          ['unknown:permission'],
          ['members:create'],
          ['members:read', 'members:read'],
          null,
        ])
          assert.equal(
            (
              await call('/api/tenant/roles', tenantA, 'POST', {
                name: 'Invalid',
                permissions,
              })
            ).status,
            400,
          );
        assert.equal(
          (
            await call('/api/tenant/roles', tenantA, 'POST', {
              name: 'Read members',
              permissions: ['members:read'],
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await call('/api/tenant/roles', tenantB, 'POST', {
              name: 'Other tenant',
              permissions: ['members:read'],
            })
          ).status,
          201,
        );
        const role = (
          await data(await call('/api/tenant/roles', tenantA))
        ).find((r: any) => r.name === 'Read members');
        const other = (
          await data(await call('/api/tenant/roles', tenantB))
        ).find((r: any) => r.name === 'Other tenant');
        assert.equal(
          (
            await call(`/api/tenant/roles/${role.id}`, tenantB, 'PATCH', {
              name: 'Stolen',
              permissions: [],
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await call(`/api/tenant/members/${person.id}`, tenantA, 'PATCH', {
              role: 'user',
              isActive: true,
              roleIds: [other.id],
            })
          ).status,
          403,
        );
        assert.equal(
          await prisma.memberRole.count({
            where: { tenantId: a.id, userId: person.id },
          }),
          0,
        );
        assert.equal(
          (
            await call(`/api/tenant/members/${person.id}`, tenantA, 'PATCH', {
              role: 'user',
              isActive: true,
              roleIds: [role.id],
            })
          ).status,
          200,
        );
        assert.equal((await call('/api/tenant/members', member)).status, 200);
        assert.equal(
          (
            await call('/api/tenant/members', member, 'POST', {
              mode: 'existing',
              username: 'admin',
              role: 'user',
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call(`/api/tenant/members/${person.id}`, member, 'PATCH', {
              role: 'user',
              isActive: true,
            })
          ).status,
          403,
        );
        assert.equal(
          (await call(`/api/tenant/members/${person.id}`, member, 'DELETE'))
            .status,
          403,
        );
        const readNav = await data(
          await call('/api/current/navigation', member),
        );
        assert(readNav.allowedPaths.includes('/tenant/members'));
        assert(!readNav.allowedPaths.includes('/dashboard/analysis'));
        assert.deepEqual(readNav.permissions, ['members:read']);
        assert.equal(
          (await call(`/api/tenant/roles/${role.id}`, tenantA, 'DELETE'))
            .status,
          409,
        );
        assert.equal(
          (
            await call('/api/tenant/roles', tenantA, 'POST', {
              name: 'Create members',
              permissions: [
                'members:read',
                'members:create',
                'members:update',
                'members:delete',
              ],
            })
          ).status,
          201,
        );
        const writer = (
          await data(await call('/api/tenant/roles', tenantA))
        ).find((r: any) => r.name === 'Create members');
        await call(`/api/tenant/members/${person.id}`, tenantA, 'PATCH', {
          role: 'user',
          isActive: true,
          roleIds: [role.id, writer.id],
        });
        assert.equal(
          (
            await call('/api/tenant/members', member, 'POST', {
              mode: 'new',
              username: 'delegated-create',
              name: 'Delegated',
              password,
              role: 'user',
            })
          ).status,
          201,
        );
        const created = await prisma.user.findUniqueOrThrow({
          where: { username: 'delegated-create' },
        });
        assert.equal(
          (
            await call(`/api/tenant/members/${created.id}`, member, 'PATCH', {
              role: 'admin',
              isActive: true,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call(`/api/tenant/members/${created.id}`, member, 'PATCH', {
              role: 'user',
              isActive: true,
              roleIds: [role.id],
            })
          ).status,
          403,
        );
        assert.equal(
          (await call(`/api/tenant/members/${owner.id}`, member, 'DELETE'))
            .status,
          403,
        );
        assert.equal(
          (await call(`/api/tenant/members/${created.id}`, member, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          (
            await call(`/api/tenant/roles/${writer.id}`, tenantA, 'PATCH', {
              name: 'Create members',
              permissions: [],
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call('/api/tenant/members', member, 'POST', {
              mode: 'existing',
              username: 'delegated-create',
              role: 'user',
            })
          ).status,
          403,
        );
        const featureCodes = (await data(
          await call(`/api/platform/tenants/${a.id}/features`, platform),
        )) as string[];
        await call(
          `/api/platform/tenants/${a.id}/features`,
          platform,
          'PATCH',
          { featureCodes: featureCodes.filter((code) => code !== 'members') },
        );
        assert.equal((await call('/api/tenant/members', member)).status, 403);
        assert(
          !(
            await data(await call('/api/current/navigation', member))
          ).permissions.includes('members:read'),
        );
        assert.equal(
          (
            await call('/api/tenant/roles', tenantA, 'POST', {
              name: 'Unavailable',
              permissions: ['members:read'],
            })
          ).status,
          400,
        );
        await call(
          `/api/platform/tenants/${a.id}/features`,
          platform,
          'PATCH',
          { featureCodes },
        );
        await call(`/api/tenant/members/${person.id}`, tenantA, 'PATCH', {
          role: 'user',
          isActive: true,
          roleIds: [],
        });
        assert.equal(
          (await call(`/api/tenant/roles/${role.id}`, tenantA, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          (await call(`/api/tenant/roles/${writer.id}`, tenantA, 'DELETE'))
            .status,
          200,
        );
        assert.equal(
          (await call(`/api/tenant/roles/${other.id}`, tenantB, 'DELETE'))
            .status,
          200,
        );
        assert(
          (
            await data(await call('/api/current/navigation', member))
          ).allowedPaths.includes('/dashboard/analysis'),
        );
        assert.equal(
          await prisma.memberRole.count({
            where: { tenantId: b.id, userId: person.id },
          }),
          0,
        );
      },
    );

    await t.test(
      'platform user management protects identities and revokes sessions',
      async () => {
        assert.equal((await call('/api/platform/users', tenantA)).status, 403);
        assert.equal((await call('/api/platform/users', member)).status, 403);
        assert.equal((await call('/api/platform/users')).status, 401);
        assert.equal(
          (
            await call('/api/platform/users', platform, 'POST', {
              username: 'managed-user',
              name: 'Managed',
              password,
              isPlatformAdmin: true,
            })
          ).status,
          201,
        );
        const person = await prisma.user.findUniqueOrThrow({
          where: { username: 'managed-user' },
        });
        assert.equal(person.isPlatformAdmin, false);
        assert.equal(
          (
            await call('/api/platform/users', platform, 'POST', {
              username: 'managed-user',
              name: 'Duplicate',
              password,
            })
          ).status,
          409,
        );
        const listed = await data(
          await call('/api/platform/users?keyword=managed-user', platform),
        );
        assert.equal(listed.length, 1);
        assert(!('passwordHash' in listed[0]));
        assert.equal(
          (
            await call(`/api/platform/users/${person.id}`, platform, 'PATCH', {
              name: 'Managed',
              isActive: 'false',
            })
          ).status,
          400,
        );
        await call('/api/tenant/members', tenantA, 'POST', {
          mode: 'existing',
          username: 'managed-user',
          role: 'user',
        });
        const session = await login('tenant-a', 'managed-user');
        assert.equal(
          (
            await call(`/api/platform/users/${person.id}`, platform, 'PATCH', {
              name: 'Managed',
              isActive: false,
            })
          ).status,
          200,
        );
        assert.equal((await call('/api/currentUser', session)).status, 401);
        const loginBody = {
          tenantCode: 'tenant-a',
          username: 'managed-user',
          password,
        };
        assert.equal(
          (await call('/api/login/account', '', 'POST', loginBody)).status,
          401,
        );
        await call(`/api/platform/users/${person.id}`, platform, 'PATCH', {
          name: 'Managed',
          isActive: true,
        });
        assert.equal((await call('/api/currentUser', session)).status, 401);
        const activeSession = await login('tenant-a', 'managed-user');
        assert.equal(
          (
            await call(
              `/api/platform/users/${person.id}/password`,
              platform,
              'POST',
              { password: 'changed-password' },
            )
          ).status,
          201,
        );
        assert.equal(
          (await call('/api/currentUser', activeSession)).status,
          401,
        );
        assert.equal(
          (await call('/api/login/account', '', 'POST', loginBody)).status,
          401,
        );
        assert.equal(
          (
            await call('/api/login/account', '', 'POST', {
              ...loginBody,
              password: 'changed-password',
            })
          ).status,
          200,
        );
        const platformUser = await prisma.user.findUniqueOrThrow({
          where: { username: 'platform-admin' },
        });
        assert.equal(
          (
            await call(
              `/api/platform/users/${platformUser.id}`,
              platform,
              'PATCH',
              { name: 'Platform', isActive: false },
            )
          ).status,
          409,
        );
        const adminUser = await prisma.user.findUniqueOrThrow({
          where: { username: 'admin' },
        });
        assert.equal(
          (
            await call(
              `/api/platform/users/${adminUser.id}`,
              platform,
              'PATCH',
              { name: 'Admin', isActive: false },
            )
          ).status,
          409,
        );
        await call(`/api/tenant/members/${person.id}`, tenantA, 'DELETE');
      },
    );

    await t.test(
      'platform identity is separate, live and independent of tenant availability',
      async () => {
        const profile = await data(await call('/api/currentUser', platform));
        assert.equal(profile.isPlatformAdmin, true);
        assert.equal(profile.tenant, null);
        assert.equal((await call('/api/platform/tenants')).status, 401);
        assert.equal(
          (await call('/api/platform/tenants', tenantA)).status,
          403,
        );
        assert.equal((await call('/api/platform/plans', member)).status, 403);
        assert.equal((await call('/api/tenant/members', member)).status, 403);
        assert.equal((await call('/api/tenant/members', platform)).status, 403);
        assert.equal((await call('/api/tenant/current', platform)).status, 403);
        const a = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-a' },
        });
        await prisma.tenant.update({
          where: { id: a.id },
          data: { isActive: false },
        });
        assert.equal(
          (await call('/api/platform/tenants', platform)).status,
          200,
        );
        assert.equal((await call('/api/currentUser', tenantA)).status, 401);
        await prisma.tenant.update({
          where: { id: a.id },
          data: { isActive: true },
        });
      },
    );

    await t.test(
      'DTO validation rejects wrong scalar types, invalid IDs and malformed nested accounts',
      async () => {
        for (const body of [
          {
            code: 'typed',
            name: 'Typed',
            maxMembers: '10',
            maxStorageMb: 100,
            maxFileSizeMb: 10,
            isActive: true,
          },
          {
            code: 'typed',
            name: 'Typed',
            maxMembers: 1.5,
            maxStorageMb: 100,
            maxFileSizeMb: 10,
            isActive: true,
          },
          {
            code: 'typed',
            name: 'Typed',
            maxMembers: 10,
            maxStorageMb: 100,
            maxFileSizeMb: 10,
            isActive: 'false',
          },
          {
            code: 'typed',
            name: 'Typed',
            maxMembers: 10,
            maxStorageMb: 100,
            maxFileSizeMb: 10,
            isActive: null,
          },
        ]) {
          const response = await call(
            '/api/platform/plans',
            platform,
            'POST',
            body,
          );
          assert.equal(response.status, 400);
          const error = (await response.json()) as {
            success: boolean;
            errorCode: number;
            errors: string[];
          };
          assert.equal(error.success, false);
          assert.equal(error.errorCode, 400);
          assert(Array.isArray(error.errors));
        }
        for (const admin of [
          [],
          [{ mode: 'existing', username: 'admin' }],
          null,
        ]) {
          const result = await call('/api/platform/tenants', platform, 'POST', {
            code: 'bad-object',
            name: 'Invalid',
            admin,
          });
          assert.equal(result.status, 400);
        }
        const sentinel = 'private-password-sentinel';
        const invalid = await call('/api/platform/tenants', platform, 'POST', {
          code: 'bad-nested',
          name: 'Nested',
          admin: {
            mode: 'new',
            username: 'nested-owner',
            name: '   ',
            password: sentinel,
          },
        });
        assert.equal(invalid.status, 400);
        const invalidBody = await invalid.text();
        assert(invalidBody.includes('admin.name'));
        assert(!invalidBody.includes(sentinel));
        for (const path of [
          '/api/platform/tenants/0',
          '/api/platform/tenants/9223372036854775808',
        ]) {
          assert.equal(
            (
              await call(path, platform, 'PATCH', {
                name: 'Invalid',
                isActive: true,
              })
            ).status,
            400,
          );
        }
        assert.equal(
          (await call('/api/platform/tenants?pageSize=101', platform)).status,
          400,
        );
        assert.equal(
          (await call('/api/platform/plans?current=not-a-number', platform))
            .status,
          400,
        );
        const page = await call(
          '/api/platform/tenants?current=2&pageSize=1',
          platform,
        );
        assert.equal(page.status, 200);
        assert.equal((await data(page)).length, 1);
        assert.equal(
          await prisma.tenant.findUnique({ where: { code: 'bad-nested' } }),
          null,
        );
      },
    );

    await t.test(
      'navigation follows tenant features and roles, with immediate revocation',
      async () => {
        const a = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-a' },
        });
        const b = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-b' },
        });
        const featurePath = `/api/platform/tenants/${a.id}/features`;
        const original = await data(await call(featurePath, platform));
        assert.equal(original.length, 11);
        const catalog = await data(
          await call('/api/platform/features', platform),
        );
        assert.equal(
          catalog.find(
            (feature: { code: string }) => feature.code === 'members',
          ).name,
          '成员管理',
        );
        assert.equal((await call('/api/current/navigation')).status, 401);
        const platformNav = await data(
          await call('/api/current/navigation', platform),
        );
        assert(
          platformNav.allowedPaths.includes('/platform/navigation/platform'),
        );
        assert.equal(
          platformNav.menus.find(
            (menu: { code: string }) => menu.code === 'platform-navigation',
          ).name,
          '平台菜单',
        );
        assert.equal(
          platformNav.menus.find(
            (menu: { code: string }) =>
              menu.code === 'platform-navigation-tenant',
          ).name,
          '租户菜单',
        );
        assert(!platformNav.allowedPaths.includes('/tenant/members'));
        const adminNav = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(adminNav.allowedPaths.includes('/tenant/members'));
        assert(adminNav.permissions.includes('members:create'));
        assert(!adminNav.allowedPaths.includes('/platform/tenants'));
        const memberNav = await data(
          await call('/api/current/navigation', member),
        );
        assert(!memberNav.allowedPaths.includes('/tenant/members'));
        assert(memberNav.permissions.includes('dashboard-analysis:view'));
        assert(
          !memberNav.permissions.some((code: string) =>
            code.startsWith('members:'),
          ),
        );
        assert.equal(
          (await call(featurePath, tenantA, 'PATCH', { featureCodes: [] }))
            .status,
          403,
        );
        assert.equal((await call('/api/platform/menus', member)).status, 403);
        assert.equal(
          (
            await call('/api/current/navigation', tenantA, 'GET', undefined, {
              'X-Tenant-ID': b.id.toString(),
            })
          ).status,
          403,
        );
        for (const featureCodes of [
          ['unknown'],
          ['members', 'members'],
          null,
          'members',
          [42],
        ]) {
          assert.equal(
            (await call(featurePath, platform, 'PATCH', { featureCodes }))
              .status,
            400,
          );
          assert.deepEqual(
            await data(await call(featurePath, platform)),
            original,
          );
        }
        assert.equal(
          (await call(featurePath, platform, 'PATCH', { featureCodes: [] }))
            .status,
          200,
        );
        const revoked = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(!revoked.allowedPaths.includes('/tenant/members'));
        assert(!revoked.allowedPaths.includes('/dashboard/analysis'));
        assert(revoked.allowedPaths.includes('/welcome'));
        assert(revoked.allowedPaths.includes('/account/settings'));
        for (const [method, path, body] of [
          ['GET', '/api/tenant/members', undefined],
          ['POST', '/api/tenant/members', {}],
          ['PATCH', '/api/tenant/members/1', {}],
          ['DELETE', '/api/tenant/members/1', undefined],
        ] as const)
          assert.equal((await call(path, tenantA, method, body)).status, 403);
        assert.equal((await call('/api/tenant/members', tenantB)).status, 200);
        // Seeding must not restore an explicitly revoked grant.
        await seedDemoData(prisma, password);
        assert.deepEqual(await data(await call(featurePath, platform)), []);
        assert.equal(
          (
            await call(featurePath, platform, 'PATCH', {
              featureCodes: ['members'],
            })
          ).status,
          200,
        );
        assert.equal((await call('/api/tenant/members', tenantA)).status, 200);
        assert.equal((await call('/api/tenant/members', member)).status, 403);
        await call(featurePath, platform, 'PATCH', { featureCodes: original });
      },
    );

    await t.test(
      'persisted menu edits affect navigation and parent visibility without changing routes',
      async () => {
        const dashboard = await prisma.menu.findUniqueOrThrow({
          where: { code: 'dashboard' },
        });
        const path = '/api/platform/menus/dashboard';
        const body = {
          name: 'Renamed dashboard',
          icon: 'home',
          sortOrder: 999,
          isActive: false,
        };
        assert.equal((await call(path, tenantA, 'PATCH', body)).status, 403);
        for (const invalid of [
          { ...body, sortOrder: '1' },
          { ...body, isActive: 'false' },
          { ...body, name: ' ' },
        ])
          assert.equal(
            (await call(path, platform, 'PATCH', invalid)).status,
            400,
          );
        assert.equal(
          (
            await call(path, platform, 'PATCH', {
              ...body,
              path: '/platform/tenants',
              scope: 'platform',
            })
          ).status,
          200,
        );
        const saved = await prisma.menu.findUniqueOrThrow({
          where: { code: 'dashboard' },
        });
        assert.equal(saved.path, dashboard.path);
        assert.equal(saved.scope, 'tenant');
        const nav = await data(await call('/api/current/navigation', tenantA));
        assert(
          !nav.menus.some((entry: { path: string | null }) =>
            entry.path?.startsWith('/dashboard'),
          ),
        );
        assert(nav.allowedPaths.includes('/dashboard/analysis'));
        assert.equal(
          (await call('/api/platform/menus/welcome', platform, 'PATCH', body))
            .status,
          400,
        );
        assert.equal(
          (
            await call(
              '/api/platform/menus/platform-navigation',
              platform,
              'PATCH',
              body,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              '/api/platform/menus/missing-menu',
              platform,
              'PATCH',
              body,
            )
          ).status,
          404,
        );
        await call(path, platform, 'PATCH', { ...body, isActive: true });
        const enabled = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert.equal(
          enabled.menus.find(
            (menu: { code: string }) => menu.code === 'dashboard',
          ).name,
          body.name,
        );
        assert(enabled.allowedPaths.includes('/dashboard/analysis'));
        await prisma.menu.updateMany({
          where: { parentCode: 'dashboard' },
          data: { isActive: false },
        });
        const emptyDirectory = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(
          !emptyDirectory.menus.some(
            (menu: { code: string }) => menu.code === 'dashboard',
          ),
        );
        assert(emptyDirectory.allowedPaths.includes('/dashboard'));
        await prisma.menu.updateMany({
          where: { parentCode: 'dashboard' },
          data: { isActive: true },
        });
        await call(path, platform, 'PATCH', {
          name: dashboard.name,
          icon: dashboard.icon,
          sortOrder: dashboard.sortOrder,
          isActive: true,
        });
      },
    );

    await t.test(
      'menu editor validates registered pages, hierarchy and module authorization',
      async () => {
        const baseMenu = {
          name: 'Custom menu',
          icon: '',
          sortOrder: 1,
          isActive: true,
        };
        assert.equal((await call('/api/platform/pages', tenantA)).status, 403);
        const pages = await data(await call('/api/platform/pages', platform));
        assert.equal(
          pages.find((page: { code: string }) => page.code === 'tenant-members')
            .featureCode,
          'members',
        );
        assert.equal(
          (
            await call('/api/platform/menus', member, 'POST', {
              ...baseMenu,
              kind: 'directory',
              scope: 'tenant',
            })
          ).status,
          403,
        );
        for (const invalid of [
          { kind: 'page', pageCode: 'unknown' },
          { kind: 'page' },
          { kind: 'directory', scope: 'authenticated' },
          { kind: 'directory' },
          {
            kind: 'directory',
            scope: 'tenant',
            parentCode: 'dashboard-analysis',
          },
          { kind: 'directory', scope: 'tenant', parentCode: 'platform' },
          { kind: 'directory', scope: 'tenant', parentCode: 'unknown' },
        ])
          assert.equal(
            (
              await call('/api/platform/menus', platform, 'POST', {
                ...baseMenu,
                ...invalid,
              })
            ).status,
            400,
          );
        const create = await call('/api/platform/menus', platform, 'POST', {
          ...baseMenu,
          kind: 'directory',
          scope: 'tenant',
          featureCode: 'members',
          path: '/fake-path',
        });
        assert.equal(create.status, 201);
        const directory = (await data(create))[0];
        assert.equal(directory.path, null);
        assert.equal(directory.featureCode, null);
        const childCreate = await call(
          '/api/platform/menus',
          platform,
          'POST',
          {
            ...baseMenu,
            kind: 'directory',
            scope: 'tenant',
            parentCode: directory.code,
          },
        );
        assert.equal(childCreate.status, 201);
        const child = (await data(childCreate))[0];
        for (const parentCode of [
          directory.code,
          child.code,
          'platform',
          'dashboard-analysis',
        ])
          assert.equal(
            (
              await call(
                `/api/platform/menus/${directory.code}`,
                platform,
                'PATCH',
                { ...baseMenu, parentCode },
              )
            ).status,
            400,
          );
        assert.equal(
          (
            await call(
              `/api/platform/menus/${directory.code}`,
              platform,
              'DELETE',
            )
          ).status,
          409,
        );
        for (const code of ['welcome', 'platform-navigation', 'platform-users'])
          assert.equal(
            (await call(`/api/platform/menus/${code}`, platform, 'DELETE'))
              .status,
            400,
          );
        assert.equal(
          (
            await call(
              '/api/platform/menus/platform-tenants',
              platform,
              'PATCH',
              { ...baseMenu, parentCode: null },
            )
          ).status,
          400,
        );

        const original = await prisma.menu.findUniqueOrThrow({
          where: { code: 'tenant-members' },
        });
        assert.equal(
          (await call('/api/platform/menus/tenant-members', platform, 'DELETE'))
            .status,
          200,
        );
        // Removing the navigation entry must not revoke the tenant's module or API permissions.
        const noEntry = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(noEntry.allowedPaths.includes('/tenant/members'));
        assert(
          !noEntry.menus.some(
            (menu: { path: string }) => menu.path === '/tenant/members',
          ),
        );
        assert.equal((await call('/api/tenant/members', tenantA)).status, 200);
        const createPage = {
          ...baseMenu,
          kind: 'page',
          pageCode: 'tenant-members',
          parentCode: child.code,
          scope: 'platform',
          minRole: 'user',
          featureCode: 'dashboard',
        };
        const created = await call(
          '/api/platform/menus',
          platform,
          'POST',
          createPage,
        );
        assert.equal(created.status, 201);
        const page = (await data(created))[0];
        assert.equal(page.path, '/tenant/members');
        assert.equal(page.featureCode, 'members');
        assert.equal(page.scope, 'tenant');
        assert.equal(page.minRole, 'admin');
        assert.equal(
          (await call('/api/platform/menus', platform, 'POST', createPage))
            .status,
          409,
        );
        const adminNav = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(
          adminNav.menus.some(
            (menu: { code: string }) => menu.code === directory.code,
          ),
        );
        const memberNav = await data(
          await call('/api/current/navigation', member),
        );
        assert(
          !memberNav.menus.some((menu: { code: string }) =>
            [page.code, child.code, directory.code].includes(menu.code),
          ),
        );
        assert(!memberNav.allowedPaths.includes('/tenant/members'));
        const analysis = await prisma.menu.findUniqueOrThrow({
          where: { code: 'dashboard-analysis' },
        });
        await call(
          '/api/platform/menus/dashboard-analysis',
          platform,
          'PATCH',
          {
            name: analysis.name,
            icon: analysis.icon,
            sortOrder: analysis.sortOrder,
            isActive: true,
            parentCode: child.code,
          },
        );
        const tenant = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-a' },
        });
        const featurePath = `/api/platform/tenants/${tenant.id}/features`;
        const grants = await data(await call(featurePath, platform));
        await call(featurePath, platform, 'PATCH', {
          featureCodes: ['dashboard'],
        });
        const mixedDirectory = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(
          mixedDirectory.menus.some(
            (menu: { code: string }) => menu.code === directory.code,
          ),
        );
        assert(
          mixedDirectory.menus.some(
            (menu: { path: string }) => menu.path === '/dashboard/analysis',
          ),
        );
        assert(
          !mixedDirectory.menus.some(
            (menu: { code: string }) => menu.code === page.code,
          ),
        );
        assert(!mixedDirectory.allowedPaths.includes('/tenant/members'));
        assert.equal((await call('/api/tenant/members', tenantA)).status, 403);
        await call(featurePath, platform, 'PATCH', { featureCodes: grants });
        await call(
          '/api/platform/menus/dashboard-analysis',
          platform,
          'PATCH',
          {
            name: analysis.name,
            icon: analysis.icon,
            sortOrder: analysis.sortOrder,
            isActive: true,
            parentCode: analysis.parentCode,
          },
        );
        await call(`/api/platform/menus/${page.code}`, platform, 'PATCH', {
          ...baseMenu,
          parentCode: null,
          isActive: false,
        });
        const hidden = await data(
          await call('/api/current/navigation', tenantA),
        );
        assert(
          !hidden.menus.some(
            (menu: { code: string }) => menu.code === page.code,
          ),
        );
        assert(hidden.allowedPaths.includes('/tenant/members'));
        assert.equal((await call('/api/tenant/members', tenantA)).status, 200);
        assert.equal(
          (await call(`/api/platform/menus/${page.code}`, tenantA, 'DELETE'))
            .status,
          403,
        );
        await call(`/api/platform/menus/${page.code}`, platform, 'DELETE');
        await call(`/api/platform/menus/${child.code}`, platform, 'DELETE');
        await call(`/api/platform/menus/${directory.code}`, platform, 'DELETE');
        await prisma.menu.create({ data: original });
      },
    );

    await t.test(
      'concurrent directory moves cannot create a cycle',
      async () => {
        const body = {
          name: 'Concurrent directory',
          icon: '',
          sortOrder: 0,
          isActive: true,
        };
        const a = (
          await data(
            await call('/api/platform/menus', platform, 'POST', {
              ...body,
              kind: 'directory',
              scope: 'tenant',
            }),
          )
        )[0];
        const b = (
          await data(
            await call('/api/platform/menus', platform, 'POST', {
              ...body,
              kind: 'directory',
              scope: 'tenant',
            }),
          )
        )[0];
        const responses = await Promise.all([
          call(`/api/platform/menus/${a.code}`, platform, 'PATCH', {
            ...body,
            parentCode: b.code,
          }),
          call(`/api/platform/menus/${b.code}`, platform, 'PATCH', {
            ...body,
            parentCode: a.code,
          }),
        ]);
        const statuses = responses.map((response) => response.status).sort();
        assert.equal(statuses[0], 200);
        assert([400, 409].includes(statuses[1]));
        await call(`/api/platform/menus/${a.code}`, platform, 'PATCH', {
          ...body,
          parentCode: null,
        });
        await call(`/api/platform/menus/${b.code}`, platform, 'PATCH', {
          ...body,
          parentCode: null,
        });
        await call(`/api/platform/menus/${a.code}`, platform, 'DELETE');
        await call(`/api/platform/menus/${b.code}`, platform, 'DELETE');
      },
    );

    let tenantId = '';
    let planId = '';
    let owner = '';
    await t.test(
      'creates tenants with initial administrators atomically, without global escalation',
      async () => {
        const created = await call('/api/platform/tenants', platform, 'POST', {
          code: 'acme',
          name: 'Acme',
          isPlatformAdmin: true,
          admin: {
            mode: 'new',
            username: 'acme-owner',
            name: 'Owner',
            password,
            isPlatformAdmin: true,
          },
        });
        assert.equal(created.status, 201);
        tenantId = (await data(created)).id;
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: 'acme-owner' },
        });
        assert.equal(user.isPlatformAdmin, false);
        owner = await login('acme', 'acme-owner');
        assert.equal((await call('/api/tenant/members', owner)).status, 200);
        const initialNav = await data(
          await call('/api/current/navigation', owner),
        );
        assert(initialNav.allowedPaths.includes('/welcome'));
        assert(initialNav.allowedPaths.includes('/tenant/members'));
        assert.deepEqual(
          (
            await data(
              await call(
                `/api/platform/tenants/${tenantId}/features`,
                platform,
              ),
            )
          ).sort(),
          ['files', 'members', 'mqtt'],
        );
        assert.equal(
          (
            await call(
              `/api/platform/tenants/${tenantId}/features`,
              platform,
              'PATCH',
              { featureCodes: ['members'] },
            )
          ).status,
          200,
        );
        assert.equal((await call('/api/tenant/members', owner)).status, 200);
        assert.equal((await call('/api/platform/tenants', owner)).status, 403);
        const duplicate = await call(
          '/api/platform/tenants',
          platform,
          'POST',
          {
            code: 'acme',
            name: 'Duplicate',
            admin: {
              mode: 'new',
              username: 'rolled-back-user',
              name: 'Rollback',
              password,
            },
          },
        );
        assert.equal(duplicate.status, 409);
        assert.equal(
          await prisma.user.findUnique({
            where: { username: 'rolled-back-user' },
          }),
          null,
        );
        assert.equal(
          (
            await call('/api/platform/tenants', platform, 'POST', {
              code: 'platform',
              name: 'Invalid',
              admin: { mode: 'existing', username: 'admin' },
            })
          ).status,
          400,
        );
        assert.equal(
          (await call('/api/platform/tenants?current=0', platform)).status,
          400,
        );
      },
    );

    await t.test(
      'tenant edits cannot alter code; suspended tenant rejects login',
      async () => {
        assert.equal(
          (
            await call(`/api/platform/tenants/${tenantId}`, platform, 'PATCH', {
              name: 'Acme edited',
              isActive: false,
              code: 'override',
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call('/api/login/account', '', 'POST', {
              tenantCode: 'acme',
              username: 'acme-owner',
              password,
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await call(`/api/platform/tenants/${tenantId}`, platform, 'PATCH', {
              name: 'Acme',
              isActive: true,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await prisma.tenant.findUniqueOrThrow({
              where: { id: BigInt(tenantId) },
            })
          ).code,
          'acme',
        );
      },
    );

    await t.test(
      'manual plan assignment validates limits, status and expiration',
      async () => {
        const unavailable = await call('/api/tenant/members', owner, 'POST', {
          mode: 'new',
          username: 'not-created',
          name: 'No plan',
          password,
          role: 'user',
        });
        assert.equal(unavailable.status, 403);
        assert.equal(
          await prisma.user.findUnique({ where: { username: 'not-created' } }),
          null,
        );
        assert.equal(
          (
            await call('/api/platform/plans', platform, 'POST', {
              code: 'invalid',
              name: 'Invalid',
              maxMembers: 0,
              maxStorageMb: 100,
              maxFileSizeMb: 10,
              isActive: true,
            })
          ).status,
          400,
        );
        const created = await call('/api/platform/plans', platform, 'POST', {
          code: 'small',
          name: 'Small',
          maxMembers: 3,
          maxStorageMb: 100,
          maxFileSizeMb: 10,
          isActive: true,
        });
        assert.equal(created.status, 201);
        planId = (await data(created)).id;
        assert.equal(
          (
            await call(
              `/api/platform/tenants/${tenantId}/subscription`,
              owner,
              'POST',
              { planId, expiresAt: future, isActive: true },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              `/api/platform/tenants/${tenantId}/subscription`,
              platform,
              'POST',
              { planId, expiresAt: 'invalid', isActive: true },
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              `/api/platform/tenants/${tenantId}/subscription`,
              platform,
              'POST',
              { planId, expiresAt: future, isActive: true },
            )
          ).status,
          201,
        );
      },
    );

    let added: { userId: bigint; user: { username: string } }[] = [];
    await t.test(
      'concurrent member creation cannot exceed the plan quota',
      async () => {
        const attempts = await Promise.all(
          [1, 2, 3].map((index) =>
            call('/api/tenant/members', owner, 'POST', {
              mode: 'new',
              username: `acme-member-${index}`,
              name: `Member ${index}`,
              password,
              role: 'user',
              tenantId: '999',
              isPlatformAdmin: true,
            }),
          ),
        );
        assert.deepEqual(
          attempts.map((result) => result.status).sort(),
          [201, 201, 409],
        );
        assert.equal(
          await prisma.tenantMembership.count({
            where: { tenantId: BigInt(tenantId), isActive: true },
          }),
          3,
        );
        added = await prisma.tenantMembership.findMany({
          where: { tenantId: BigInt(tenantId), role: 'user' },
          select: { userId: true, user: { select: { username: true } } },
        });
        assert.equal(added.length, 2);
        assert.equal(
          (await data(await call('/api/tenant/subscription', owner))).used,
          3,
        );
      },
    );

    await t.test(
      'protects last administrator and rejects cross-tenant member writes',
      async () => {
        const ownerUser = await prisma.user.findUniqueOrThrow({
          where: { username: 'acme-owner' },
        });
        for (const body of [
          { role: 'user', isActive: true },
          { role: 'admin', isActive: false },
        ]) {
          assert.equal(
            (
              await call(
                `/api/tenant/members/${ownerUser.id}`,
                owner,
                'PATCH',
                body,
              )
            ).status,
            409,
          );
        }
        assert.equal(
          (await call(`/api/tenant/members/${ownerUser.id}`, owner, 'DELETE'))
            .status,
          409,
        );
        const foreignUser = await prisma.user.findUniqueOrThrow({
          where: { username: 'tenant-b-user' },
        });
        assert.equal(
          (
            await call(
              `/api/tenant/members/${foreignUser.id}`,
              owner,
              'PATCH',
              { role: 'user', isActive: false },
            )
          ).status,
          404,
        );
        assert.equal(
          (await call(`/api/tenant/members/${foreignUser.id}`, owner, 'DELETE'))
            .status,
          404,
        );
        assert.equal((await call('/api/currentUser', tenantB)).status, 200);
        assert.equal(
          (
            await call('/api/tenant/members', owner, 'GET', undefined, {
              'X-Tenant-ID': '999',
            })
          ).status,
          403,
        );
        const rows = await data(
          await call('/api/tenant/members?tenantId=999', owner),
        );
        assert.equal(rows.length, 3);
      },
    );

    await t.test(
      'disabling revokes sessions; reactivation observes quota; removal keeps global account',
      async () => {
        const cookie = await login('acme', added[0].user.username);
        assert.equal(
          (
            await call(
              `/api/tenant/members/${added[0].userId}`,
              owner,
              'PATCH',
              { role: 'user', isActive: false },
            )
          ).status,
          200,
        );
        assert.equal((await call('/api/currentUser', cookie)).status, 401);
        const shared = await prisma.user.findUniqueOrThrow({
          where: { username: 'admin' },
        });
        const before = shared.passwordHash;
        assert.equal(
          (
            await call('/api/tenant/members', owner, 'POST', {
              mode: 'existing',
              username: 'admin',
              role: 'user',
              password: 'must-not-reset',
              tenantId: '999',
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await prisma.user.findUniqueOrThrow({
              where: { username: 'admin' },
            })
          ).passwordHash,
          before,
        );
        assert.equal(
          (
            await call(
              `/api/tenant/members/${added[0].userId}`,
              owner,
              'PATCH',
              { role: 'user', isActive: true },
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(`/api/platform/plans/${planId}`, platform, 'PATCH', {
              name: 'Small',
              maxMembers: 2,
              maxStorageMb: 100,
              maxFileSizeMb: 10,
              isActive: true,
            })
          ).status,
          409,
        );
        assert.equal(
          (await call(`/api/tenant/members/${shared.id}`, owner, 'DELETE'))
            .status,
          200,
        );
        assert.equal((await call('/api/currentUser', tenantA)).status, 200);
        assert.equal(
          (
            await call(
              `/api/tenant/members/${added[0].userId}`,
              owner,
              'PATCH',
              { role: 'user', isActive: true },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call('/api/tenant/members', owner, 'POST', {
              mode: 'existing',
              username: 'platform-admin',
              role: 'admin',
            })
          ).status,
          409,
        );
      },
    );

    await t.test(
      'expired or suspended subscription blocks additions but permits viewing and cleanup',
      async () => {
        await prisma.subscription.update({
          where: { tenantId: BigInt(tenantId) },
          data: {
            startsAt: new Date(Date.now() - 172800000),
            expiresAt: new Date(Date.now() - 86400000),
          },
        });
        assert.equal((await call('/api/tenant/members', owner)).status, 200);
        assert.equal(
          (
            await call('/api/tenant/members', owner, 'POST', {
              mode: 'existing',
              username: 'admin',
              role: 'user',
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              `/api/tenant/members/${added[0].userId}`,
              owner,
              'DELETE',
            )
          ).status,
          200,
        );
        assert(
          await prisma.user.findUnique({ where: { id: added[0].userId } }),
        );
        assert.equal(
          (
            await call(
              `/api/platform/tenants/${tenantId}/subscription`,
              platform,
              'POST',
              { planId, expiresAt: future, isActive: false },
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await call('/api/tenant/members', owner, 'POST', {
              mode: 'existing',
              username: 'admin',
              role: 'user',
            })
          ).status,
          403,
        );
      },
    );

    await t.test(
      'plan availability controls new assignments and platform revocation takes effect immediately',
      async () => {
        assert.equal(
          (
            await call(`/api/platform/plans/${planId}`, platform, 'PATCH', {
              name: 'Small',
              maxMembers: 3,
              maxStorageMb: 100,
              maxFileSizeMb: 10,
              isActive: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              `/api/platform/tenants/${tenantId}/subscription`,
              platform,
              'POST',
              { planId, expiresAt: future, isActive: true },
            )
          ).status,
          409,
        );
        await prisma.user.update({
          where: { username: 'platform-admin' },
          data: { isPlatformAdmin: false },
        });
        assert.equal(
          (await call('/api/platform/tenants', platform)).status,
          401,
        );
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
