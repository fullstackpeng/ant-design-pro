import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { NestFactory } from '@nestjs/core';
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
    await promisify(execFile)(
      process.execPath,
      [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
      { env: process.env },
    );
    await seedDemoData(prisma, password);
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    app.use(cookieParser());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    const platform = await login('platform', 'platform-admin');
    const tenantA = await login('tenant-a', 'admin');
    const tenantB = await login('tenant-b', 'tenant-b-user');
    const member = await login('tenant-a', 'tenant-a-user');

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
              isActive: true,
            })
          ).status,
          400,
        );
        const created = await call('/api/platform/plans', platform, 'POST', {
          code: 'small',
          name: 'Small',
          maxMembers: 3,
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
