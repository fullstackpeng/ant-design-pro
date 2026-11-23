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

import { StorageProtocolRegistry } from '../storage/protocols/storage-protocol.registry.js';

test('account profile, organization, avatars and session security', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const originalKey = process.env.STORAGE_SECRET_KEY;
  process.env.STORAGE_SECRET_KEY = randomBytes(32).toString('base64');
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `account_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'account-test-password';

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

  async function login(
    tenantCode: string,
    username: string,
    loginPassword = password,
  ) {
    const response = await fetch(`${base}/api/login/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantCode, username, password: loginPassword }),
    });
    assert.equal(response.status, 200);
    return (response.headers.get('set-cookie') ?? '').split(';')[0];
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

    const objects = new Map<string, Buffer>();
    let failUpload = false;
    app.get(StorageProtocolRegistry).register({
      protocol: 'account-test',
      label: 'Account test',
      configFields: [],
      secretFields: [],
      validate() {},
      createDriver() {
        return {
          async upload({ key, body }) {
            if (failUpload) throw new Error('Upload failed');
            const chunks: Buffer[] = [];
            for await (const chunk of body) chunks.push(Buffer.from(chunk));
            objects.set(key, Buffer.concat(chunks));
            return {};
          },
          async delete(key) {
            objects.delete(key);
          },
          async signDownload(key) {
            return `https://account.test/${encodeURIComponent(key)}`;
          },
          async healthCheck() {},
        };
      },
    });
    const adminA = await login('tenant-a', 'admin');
    const adminB = await login('tenant-b', 'admin');
    const userA = await login('tenant-a', 'tenant-a-user');
    const platform = await login('platform', 'platform-admin');
    const tenantA = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-a' },
    });
    const tenantB = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-b' },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
    });
    const member = await prisma.user.findUniqueOrThrow({
      where: { username: 'tenant-a-user' },
    });
    async function data(response: Response, status = 200) {
      assert.equal(response.status, status, await response.clone().text());
      return (await response.json()).data;
    }
    async function profile(cookie: string) {
      return data(await api('/api/account/profile', cookie));
    }
    async function upload(cookie: string, bytes: Buffer, type = 'image/png') {
      const form = new FormData();
      form.append(
        'file',
        new Blob([new Uint8Array(bytes)], { type }),
        'avatar.png',
      );
      return fetch(`${base}/api/account/avatar`, {
        method: 'POST',
        headers: { Cookie: cookie },
        body: form,
      });
    }
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    );

    await t.test(
      'self service needs login, but not tenant features or management permissions',
      async () => {
        assert.equal((await api('/api/account/profile')).status, 401);
        assert.equal((await api('/api/account/profile', userA)).status, 200);
        const platformProfile = await profile(platform);
        assert.equal(platformProfile.tenant, null);
        assert.equal(platformProfile.isPlatformAdmin, true);
        assert.equal(platformProfile.avatar, null);
        assert.ok(!JSON.stringify(platformProfile).includes('passwordHash'));
        assert.equal(
          (await api('/api/account/profile', userA, 'PATCH', { name: '   ' }))
            .status,
          400,
        );
        assert.equal(
          (
            await api('/api/account/profile', userA, 'PATCH', {
              name: 'a'.repeat(101),
            })
          ).status,
          400,
        );
        await data(
          await api('/api/account/profile', userA, 'PATCH', {
            name: ' Member Name ',
            userId: String(user.id),
            isPlatformAdmin: true,
            role: 'admin',
          }),
        );
        assert.equal((await profile(userA)).name, 'Member Name');
        const unchanged = await prisma.user.findUniqueOrThrow({
          where: { id: member.id },
        });
        assert.equal(unchanged.username, 'tenant-a-user');
        assert.equal(unchanged.isPlatformAdmin, false);
        assert.equal((await profile(userA)).tenant.role, 'user');
        assert.equal((await profile(adminA)).username, 'admin');
        await prisma.tenantFeature.deleteMany({
          where: {
            tenantId: tenantA.id,
            featureCode: { in: ['files', 'members'] },
          },
        });
        assert.equal((await api('/api/account/profile', userA)).status, 200);
      },
    );

    await t.test(
      'one global profile shows only the current tenant organization',
      async () => {
        const root = await prisma.tenantDepartment.create({
          data: { tenantId: tenantA.id, code: 'root', name: 'Head' },
        });
        const child = await prisma.tenantDepartment.create({
          data: {
            tenantId: tenantA.id,
            code: 'eng',
            name: 'Engineering',
            parentId: root.id,
            isActive: false,
          },
        });
        const other = await prisma.tenantDepartment.create({
          data: { tenantId: tenantB.id, code: 'sales', name: 'Sales' },
        });
        for (const row of [
          { tenantId: tenantA.id, departmentId: child.id },
          { tenantId: tenantB.id, departmentId: other.id },
        ]) {
          await prisma.tenantMembership.update({
            where: {
              tenantId_userId: { tenantId: row.tenantId, userId: user.id },
            },
            data: { departmentId: row.departmentId },
          });
        }
        const role = await prisma.tenantRole.create({
          data: {
            tenantId: tenantA.id,
            name: 'Engineer role',
            permissions: ['members:read'],
          },
        });
        await prisma.memberRole.create({
          data: { tenantId: tenantA.id, userId: user.id, roleId: role.id },
        });
        for (const code of ['engineer', 'manager']) {
          const position = await prisma.tenantPosition.create({
            data: { tenantId: tenantA.id, name: code, code },
          });
          await prisma.memberPosition.create({
            data: {
              tenantId: tenantA.id,
              userId: user.id,
              positionId: position.id,
            },
          });
        }
        const a = await profile(adminA);
        const b = await profile(adminB);
        assert.equal(a.tenant.department.path, 'Head / Engineering');
        assert.equal(a.tenant.department.isActive, false);
        assert.equal(a.tenant.positions.length, 2);
        assert.deepEqual(a.tenant.roles, [
          { id: String(role.id), name: 'Engineer role' },
        ]);
        assert.equal(b.tenant.department.path, 'Sales');
        assert.deepEqual(b.tenant.positions, []);
        assert.deepEqual(b.tenant.roles, []);
        await data(
          await api('/api/account/profile', adminA, 'PATCH', {
            name: 'Global Display',
          }),
        );
        assert.equal((await profile(adminB)).name, 'Global Display');
        assert.equal(
          (await data(await api('/api/currentUser', adminB))).name,
          'Global Display',
        );
      },
    );

    await t.test(
      'avatars are global, owned by the account and independent of tenant files',
      async () => {
        assert.equal((await upload('', png)).status, 401);
        assert.equal(
          (await upload(userA, Buffer.from('<svg/>'), 'image/svg+xml')).status,
          400,
        );
        assert.equal(
          (await upload(userA, Buffer.from('fake image'))).status,
          400,
        );
        assert.equal(
          (await upload(userA, Buffer.alloc(2 * 1024 * 1024 + 1))).status,
          413,
        );
        assert.equal(
          (await api('/api/account/avatar', userA, 'POST')).status,
          400,
        );
        const provider = {
          code: 'avatars',
          name: 'Avatars',
          protocol: 'account-test',
          config: {},
          secrets: {},
          isActive: true,
        };
        await data(
          await api(
            '/api/platform/storage/providers',
            platform,
            'POST',
            provider,
          ),
          201,
        );
        const result = await data(await upload(adminA, png), 201);
        assert.match(result.url, /^\/api\/account\/avatar\/[0-9a-f-]+$/);
        assert.equal((await profile(adminB)).avatar, result.url);
        assert.equal(
          (await data(await api('/api/currentUser', adminA))).avatar,
          result.url,
        );
        assert.equal(objects.size, 1);
        const read = await fetch(base + result.url, {
          headers: { Cookie: adminB },
          redirect: 'manual',
        });
        assert.equal(read.status, 302);
        assert.equal(read.headers.get('cache-control'), 'no-store');
        assert.ok(
          read.headers.get('location')?.startsWith('https://account.test/'),
        );
        assert.equal((await api(result.url, userA)).status, 404);
        assert.equal((await api(result.url, platform)).status, 404);
        assert.equal(await prisma.fileObject.count(), 0);
        const storage = await prisma.storageProvider.findUniqueOrThrow({
          where: { code: 'avatars' },
        });
        assert.equal(
          (
            await api(
              `/api/platform/storage/providers/${storage.id}`,
              platform,
              'PATCH',
              {
                name: 'Avatars',
                isActive: true,
                config: { changed: true },
                revision: storage.revision,
              },
            )
          ).status,
          409,
        );
        const next = await data(await upload(adminA, png), 201);
        assert.notEqual(next.url, result.url);
        assert.equal(objects.size, 1);
        assert.equal((await api(result.url, adminA)).status, 404);
        failUpload = true;
        assert.equal((await upload(adminA, png)).status, 500);
        failUpload = false;
        assert.equal((await profile(adminA)).avatar, next.url);
        assert.equal(objects.size, 1);
        await data(await upload(userA, png), 201);
        assert.equal(objects.size, 2);
        await data(await api('/api/account/avatar', adminA, 'DELETE'));
        assert.equal((await profile(adminB)).avatar, null);
        assert.equal(objects.size, 1);
        await data(await api('/api/account/avatar', adminA, 'DELETE'));
        await data(await api('/api/account/avatar', userA, 'DELETE'));
        assert.equal(objects.size, 0);
        const platformAvatar = await data(await upload(platform, png), 201);
        assert.equal((await profile(platform)).avatar, platformAvatar.url);
        await data(await api('/api/account/avatar', platform, 'DELETE'));
      },
    );

    await t.test(
      'logout others revokes cross-tenant sessions and preserves current and other users',
      async () => {
        const duplicate = await login('tenant-a', 'admin');
        await data(
          await api('/api/account/sessions/revoke-others', adminA, 'POST'),
        );
        assert.equal((await api('/api/currentUser', adminA)).status, 200);
        for (const cookie of [adminB, duplicate])
          assert.equal((await api('/api/currentUser', cookie)).status, 401);
        assert.equal((await api('/api/currentUser', userA)).status, 200);
        assert.equal((await api('/api/currentUser', platform)).status, 200);
      },
    );

    await t.test(
      'password validation is real and a successful change revokes every login',
      async () => {
        const other = await login('tenant-b', 'admin');
        const next = 'new-account-password';
        assert.equal(
          (
            await api('/api/account/password', adminA, 'POST', {
              currentPassword: 'wrong',
              newPassword: next,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api('/api/account/password', adminA, 'POST', {
              currentPassword: password,
              newPassword: password,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api('/api/account/password', adminA, 'POST', {
              currentPassword: password,
              newPassword: 'short',
            })
          ).status,
          400,
        );
        assert.equal((await api('/api/currentUser', other)).status, 200);
        const result = await api('/api/account/password', adminA, 'POST', {
          currentPassword: password,
          newPassword: next,
        });
        await data(result);
        assert.match(result.headers.get('set-cookie') ?? '', /Path=\/api/);
        assert.match(
          result.headers.get('set-cookie') ?? '',
          /Expires=Thu, 01 Jan 1970/,
        );
        for (const cookie of [adminA, other])
          assert.equal((await api('/api/currentUser', cookie)).status, 401);
        assert.equal((await api('/api/currentUser', userA)).status, 200);
        assert.equal(
          (
            await api('/api/login/account', '', 'POST', {
              tenantCode: 'tenant-a',
              username: 'admin',
              password,
            })
          ).status,
          401,
        );
        const fresh = await login('tenant-b', 'admin', next);
        assert.equal((await profile(fresh)).name, 'Global Display');
        await data(
          await api('/api/account/password', platform, 'POST', {
            currentPassword: password,
            newPassword: 'platform-new-password',
          }),
        );
        assert.equal((await api('/api/currentUser', platform)).status, 401);
        const platformFresh = await login(
          'platform',
          'platform-admin',
          'platform-new-password',
        );
        assert.equal((await profile(platformFresh)).tenant, null);
      },
    );
  } finally {
    await app?.close();
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    if (originalKey === undefined) delete process.env.STORAGE_SECRET_KEY;
    else process.env.STORAGE_SECRET_KEY = originalKey;
  }
});
