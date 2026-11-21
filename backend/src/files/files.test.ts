import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { AppModule } from '../app.module.js';
import { invalid } from '../common/validation.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';
import { StorageProtocolRegistry } from '../storage/protocols/storage-protocol.registry.js';
import type { StorageProtocolDefinition } from '../storage/protocols/storage-protocol.types.js';
import { buildObjectKey } from './file-object-key.js';

const objects = new Map<string, { size: number }>();

const fakeProtocol: StorageProtocolDefinition = {
  protocol: 'fake',
  label: 'Fake',
  configFields: [
    { key: 'bucket', label: 'Bucket', type: 'text', required: true },
  ],
  secretFields: [
    { key: 'token', label: 'Token', type: 'password', required: true },
  ],
  validate(config, secrets) {
    if (typeof config.bucket !== 'string' || !config.bucket)
      invalid('bucket required');
    if (config.failConnection === true) return;
    if (typeof secrets.token !== 'string' || !secrets.token)
      invalid('token required');
  },
  createDriver(config) {
    return {
      async upload({ key, size }) {
        objects.set(key, { size });
        return { etag: 'fake-etag' };
      },
      async delete(key) {
        objects.delete(key);
      },
      async signDownload(key) {
        return `https://fake.local/${encodeURIComponent(key)}`;
      },
      async healthCheck() {
        if (config.failConnection === true) throw new Error('unreachable');
      },
    };
  },
};

test('object keys use UTC date folders and safe extensions', () => {
  const now = new Date('2026-11-21T23:30:00.000Z');
  assert.equal(
    buildObjectKey(7n, 'Photo.PNG', now, 'uuid-1'),
    'tenants/7/2026/11/21/uuid-1.png',
  );
  assert.equal(
    buildObjectKey(null, 'no-extension', now, 'uuid-2'),
    'platform/2026/11/21/uuid-2',
  );
  assert.equal(
    buildObjectKey(7n, 'file.verylongextension', now, 'uuid-3'),
    'tenants/7/2026/11/21/uuid-3',
  );
  assert.equal(
    buildObjectKey(7n, 'a.txt', new Date('2026-11-22T00:30:00Z'), 'uuid-4'),
    'tenants/7/2026/11/22/uuid-4.txt',
  );
});

test('storage providers and file management', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const originalKey = process.env.STORAGE_SECRET_KEY;
  process.env.STORAGE_SECRET_KEY = randomBytes(32).toString('base64');
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `files_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'test-password';

  async function call(
    path: string,
    cookie = '',
    method = 'GET',
    body?: unknown,
  ) {
    return fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
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
    return ((await response.json()) as { data: any }).data;
  }
  async function upload(
    path: string,
    cookie: string,
    name: string,
    bytes: number,
    type = 'text/plain',
  ) {
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(bytes, 'a')], { type }), name);
    return fetch(base + path, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    });
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
    app.use(cookieParser());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    app.get(StorageProtocolRegistry).register(fakeProtocol);

    const platform = await login('platform', 'platform-admin');
    const tenantA = await login('tenant-a', 'admin');
    const tenantB = await login('tenant-b', 'tenant-b-user');
    const member = await login('tenant-a', 'tenant-a-user');

    await t.test('storage endpoints are platform-only', async () => {
      assert.equal((await call('/api/platform/storage/providers')).status, 401);
      for (const cookie of [tenantA, member, tenantB]) {
        assert.equal(
          (await call('/api/platform/storage/providers', cookie)).status,
          403,
        );
        assert.equal((await call('/api/platform/files', cookie)).status, 403);
      }
      const protocols = await data(
        await call('/api/platform/storage/protocols', platform),
      );
      assert(
        protocols.some((item: { protocol: string }) => item.protocol === 's3'),
      );
      assert.equal((await call('/api/platform/storage/protocols')).status, 401);
    });

    await t.test(
      'file feature and permissions gate tenant access',
      async () => {
        assert.equal((await call('/api/tenant/files', member)).status, 200);
        assert.equal(
          (await upload('/api/tenant/files', member, 'blocked.txt', 3)).status,
          403,
        );
        const tenant = await prisma.tenant.findUniqueOrThrow({
          where: { code: 'tenant-a' },
        });
        await prisma.tenantFeature.delete({
          where: {
            tenantId_featureCode: { tenantId: tenant.id, featureCode: 'files' },
          },
        });
        assert.equal((await call('/api/tenant/files', tenantA)).status, 403);
        await prisma.tenantFeature.create({
          data: { tenantId: tenant.id, featureCode: 'files' },
        });
      },
    );

    await t.test(
      'providers encrypt secrets, keep one default and never return secrets',
      async () => {
        assert.equal(
          (
            await call('/api/platform/storage/providers', platform, 'POST', {
              code: 'fake-main',
              name: 'Fake Main',
              protocol: 'fake',
              config: { bucket: 'main' },
              secrets: { token: '' },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call('/api/platform/storage/providers', platform, 'POST', {
              code: 'fake-main',
              name: 'Fake Main',
              protocol: 'fake',
              config: { bucket: 'main' },
              secrets: { token: 'plain-secret-token' },
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await call('/api/platform/storage/providers', platform, 'POST', {
              code: 'fake-backup',
              name: 'Fake Backup',
              protocol: 'fake',
              config: { bucket: 'backup' },
              secrets: { token: 'backup-token' },
            })
          ).status,
          201,
        );
        let providers = await data(
          await call('/api/platform/storage/providers', platform),
        );
        assert.deepEqual(
          providers.map((provider: { code: string }) => provider.code),
          ['fake-main', 'fake-backup'],
        );
        assert.equal(providers[0].isDefault, true);
        assert.equal(providers[1].isDefault, false);
        assert.deepEqual(providers[0].secretKeys, ['token']);
        assert(!JSON.stringify(providers).includes('plain-secret-token'));
        const row = await prisma.storageProvider.findUniqueOrThrow({
          where: { code: 'fake-main' },
        });
        assert(!row.secrets.includes('plain-secret-token'));
        assert.equal(row.secretKeyVersion, 1);

        const backupId = providers[1].id;
        assert.equal(
          (
            await call(
              `/api/platform/storage/providers/${backupId}/default`,
              platform,
              'POST',
            )
          ).status,
          201,
        );
        providers = await data(
          await call('/api/platform/storage/providers', platform),
        );
        assert.equal(
          providers.find(
            (provider: { code: string }) => provider.code === 'fake-main',
          ).isDefault,
          false,
        );
        assert.equal(
          providers.find(
            (provider: { code: string }) => provider.code === 'fake-backup',
          ).isDefault,
          true,
        );
        assert.equal(
          (
            await call(
              `/api/platform/storage/providers/${backupId}/test`,
              platform,
              'POST',
            )
          ).status,
          201,
        );

        assert.equal(
          (
            await call('/api/platform/storage/providers', platform, 'POST', {
              code: 'fake-off',
              name: 'Fake Off',
              protocol: 'fake',
              config: { bucket: 'off', failConnection: true },
              secrets: { token: 'off-token' },
              isActive: false,
            })
          ).status,
          201,
        );
        const off = (
          await data(await call('/api/platform/storage/providers', platform))
        ).find((provider: { code: string }) => provider.code === 'fake-off');
        assert.equal(
          (
            await call(
              `/api/platform/storage/providers/${off.id}/default`,
              platform,
              'POST',
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              `/api/platform/storage/providers/${off.id}/test`,
              platform,
              'POST',
            )
          ).status,
          502,
        );
      },
    );

    await t.test(
      'site assets are public, image-only and isolated from private files',
      async () => {
        assert.equal(
          (
            await upload(
              '/api/platform/files/site-assets',
              tenantA,
              'logo.png',
              20,
              'image/png',
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await upload(
              '/api/platform/files/site-assets',
              platform,
              'logo.txt',
              20,
              'text/plain',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await upload(
              '/api/platform/files/site-assets',
              platform,
              'logo.svg',
              20,
              'image/svg+xml',
            )
          ).status,
          400,
        );
        const created = await upload(
          '/api/platform/files/site-assets',
          platform,
          'logo.png',
          20,
          'image/png',
        );
        assert.equal(created.status, 201);
        const body = (await created.json()) as {
          data: { id: string; url: string };
        };
        assert.match(body.data.url, /^\/api\/site-assets\/\d+$/);
        const stored = await prisma.fileObject.findUniqueOrThrow({
          where: { id: BigInt(body.data.id) },
        });
        assert.equal(stored.visibility, 'public');
        const redirect = await fetch(base + body.data.url, {
          redirect: 'manual',
        });
        assert.equal(redirect.status, 302);
        assert.match(
          redirect.headers.get('location') ?? '',
          /^https:\/\/fake\.local\//,
        );

        assert.equal(
          (await upload('/api/platform/files', platform, 'private.txt', 20))
            .status,
          201,
        );
        const privateRow = await prisma.fileObject.findFirstOrThrow({
          where: { originalName: 'private.txt' },
        });
        assert.equal(
          (await fetch(`${base}/api/site-assets/${privateRow.id}`)).status,
          404,
        );
        await call(`/api/platform/files/${privateRow.id}`, platform, 'DELETE');
        assert.equal(
          (
            await call(
              `/api/platform/files/${body.data.id}`,
              platform,
              'DELETE',
            )
          ).status,
          200,
        );
      },
    );

    let fileId = '';
    await t.test(
      'tenant upload is isolated, visible to platform and configurable limits apply',
      async () => {
        const created = await upload(
          '/api/tenant/files',
          tenantA,
          'note.txt',
          10,
        );
        assert.equal(created.status, 201);
        assert.equal(
          (
            await upload(
              '/api/tenant/files',
              tenantA,
              'bad.exe',
              4,
              'application/x-msdownload',
            )
          ).status,
          400,
        );
        const listA = await call('/api/tenant/files', tenantA);
        const bodyA = (await listA.json()) as {
          data: { id: string; size: string; providerName: string }[];
          total: number;
        };
        assert.equal(bodyA.total, 1);
        assert.equal(bodyA.data[0].size, '10');
        assert.equal(bodyA.data[0].providerName, 'Fake Backup');
        fileId = bodyA.data[0].id;
        const stored = await prisma.fileObject.findUniqueOrThrow({
          where: { id: BigInt(fileId) },
        });
        assert.match(
          stored.objectKey,
          /^tenants\/\d+\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\.txt$/,
        );
        assert.equal(
          (await call(`/api/tenant/files/${fileId}/download`, tenantB)).status,
          404,
        );
        assert.equal(
          (await call(`/api/tenant/files/${fileId}`, tenantB, 'DELETE')).status,
          404,
        );
        assert.equal(
          (
            (await (await call('/api/tenant/files', tenantB)).json()) as {
              total: number;
            }
          ).total,
          0,
        );
        const platformList = await call(
          '/api/platform/files?tenant=tenant-a',
          platform,
        );
        const platformBody = (await platformList.json()) as {
          data: { id: string; tenantCode: string | null }[];
          total: number;
        };
        assert.equal(platformBody.total, 1);
        assert.equal(platformBody.data[0].tenantCode, 'tenant-a');
        const download = await data(
          await call(`/api/platform/files/${fileId}/download`, platform),
        );
        assert.match(download.url, /^https:\/\/fake\.local\//);
        assert.equal(
          (
            await (
              await call(`/api/tenant/files/${fileId}/download`, tenantA)
            ).json()
          ).data.expiresInSeconds,
          300,
        );

        const providers = await data(
          await call('/api/platform/storage/providers', platform),
        );
        const active = providers.find(
          (provider: { code: string }) => provider.code === 'fake-backup',
        );
        assert.equal(
          (
            await call(
              `/api/platform/storage/providers/${active.id}`,
              platform,
              'PATCH',
              {
                name: active.name,
                config: { bucket: 'changed' },
                isActive: true,
                revision: active.revision,
              },
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              `/api/platform/storage/providers/${active.id}`,
              platform,
              'PATCH',
              {
                name: 'Renamed',
                config: active.config,
                isActive: true,
                revision: active.revision,
              },
            )
          ).status,
          200,
        );
      },
    );

    await t.test('plan file size and storage quota are enforced', async () => {
      const plan = await prisma.plan.findUniqueOrThrow({
        where: { code: 'basic' },
      });
      await prisma.plan.update({
        where: { id: plan.id },
        data: { maxFileSizeMb: 1 },
      });
      assert.equal(
        (
          await upload(
            '/api/tenant/files',
            tenantA,
            'too-large.bin',
            1024 * 1024 + 1,
            'application/octet-stream',
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await upload(
            '/api/tenant/files',
            tenantA,
            'limit.txt',
            1024 * 1024,
            'text/plain',
          )
        ).status,
        201,
      );
      const existing = (await (
        await call('/api/tenant/files', tenantA)
      ).json()) as { data: { id: string }[] };
      for (const record of existing.data)
        assert.equal(
          (await call(`/api/tenant/files/${record.id}`, tenantA, 'DELETE'))
            .status,
          200,
        );
      await prisma.plan.update({
        where: { id: plan.id },
        data: { maxFileSizeMb: 100, maxStorageMb: 1 },
      });
      const first = await upload(
        '/api/tenant/files',
        tenantA,
        'half-a.txt',
        600 * 1024,
      );
      assert.equal(first.status, 201);
      assert.equal(
        (await upload('/api/tenant/files', tenantA, 'half-b.txt', 600 * 1024))
          .status,
        409,
      );
      await prisma.plan.update({
        where: { id: plan.id },
        data: { maxStorageMb: 5120 },
      });
      const records = (await (
        await call('/api/tenant/files', tenantA)
      ).json()) as { data: { id: string }[] };
      for (const record of records.data)
        assert.equal(
          (await call(`/api/tenant/files/${record.id}`, tenantA, 'DELETE'))
            .status,
          200,
        );
      assert.equal(
        (
          (await (await call('/api/tenant/files', tenantA)).json()) as {
            total: number;
          }
        ).total,
        0,
      );
    });

    await t.test('platform files are separate from tenant files', async () => {
      assert.equal(
        (await upload('/api/platform/files', platform, 'platform.txt', 5))
          .status,
        201,
      );
      const platformFiles = (await (
        await call('/api/platform/files?tenant=platform', platform)
      ).json()) as { data: { tenantCode: string | null }[]; total: number };
      assert.equal(
        platformFiles.data.some((row) => row.tenantCode === null),
        false,
      );
      const all = (await (
        await call('/api/platform/files', platform)
      ).json()) as { data: { id: string; tenantCode: string | null }[] };
      const row = all.data.find((item) => item.tenantCode === null);
      assert(row);
      const stored = await prisma.fileObject.findUniqueOrThrow({
        where: { id: BigInt(row.id) },
      });
      assert.match(
        stored.objectKey,
        /^platform\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\.txt$/,
      );
      assert.equal(
        (
          (await (await call('/api/tenant/files', tenantA)).json()) as {
            total: number;
          }
        ).total,
        0,
      );
      assert.equal(
        (await call(`/api/platform/files/${row.id}`, platform, 'DELETE'))
          .status,
        200,
      );
    });
  } finally {
    objects.clear();
    await app?.close();
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.STORAGE_SECRET_KEY;
    else process.env.STORAGE_SECRET_KEY = originalKey;
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
