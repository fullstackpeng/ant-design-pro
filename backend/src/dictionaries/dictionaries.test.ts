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
import type { SessionContext } from '../auth/session-context.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';
import { DictionariesService } from './dictionaries.service.js';
import type { DictionaryAuditListResponseDto } from './dto/dictionary-response.dto.js';
import type { PlatformDictionaryDetailDto } from './dto/platform-dictionary-response.dto.js';

test('tenant dictionaries: isolation, permissions, immutable values and history', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `dictionary_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'dictionary-test-password';
  async function call(
    path: string,
    cookie = '',
    method = 'GET',
    body?: unknown,
    headers = {},
  ) {
    return api(
      `/api/tenant/dictionaries${path}`,
      cookie,
      method,
      body,
      headers,
    );
  }
  async function api(
    path: string,
    cookie = '',
    method = 'GET',
    body?: unknown,
    headers = {},
  ) {
    return fetch(`${base}${path}`, {
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
    const response = await fetch(`${base}/api/login/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantCode, username, password }),
    });
    assert.equal(response.status, 200);
    return (response.headers.get('set-cookie') ?? '').split(';')[0];
  }
  async function detail(cookie: string, code = 'customer_source') {
    const response = await call(`/${code}`, cookie);
    assert.equal(response.status, 200);
    return (
      (await response.json()) as {
        data: {
          code: string;
          name: string;
          isActive: boolean;
          items: {
            id: string;
            value: string;
            label: string;
            isActive: boolean;
          }[];
        };
      }
    ).data;
  }
  async function shared(cookie: string, code = 'customer_source') {
    const response = await api(`/api/dictionaries/platform/${code}`, cookie);
    assert.equal(response.status, 200);
    return ((await response.json()) as { data: PlatformDictionaryDetailDto })
      .data;
  }
  const dictionary = {
    code: 'customer_source',
    name: '客户来源',
    remark: '',
    isActive: true,
  };
  const item = {
    value: 'referral',
    label: '转介绍',
    sortOrder: 20,
    isActive: true,
    color: 'green',
  };
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
    const tenantA = await login('tenant-a', 'admin');
    const tenantB = await login('tenant-b', 'tenant-b-user');
    const member = await login('tenant-a', 'tenant-a-user');
    const platform = await login('platform', 'platform-admin');
    const a = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-a' },
    });
    const b = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-b' },
    });

    await t.test(
      'authentication, management permissions and validation are enforced',
      async () => {
        assert.equal((await call('')).status, 401);
        assert.equal((await call('', platform)).status, 403);
        assert.equal((await call('', member)).status, 403);
        assert.equal((await call('', member, 'POST', dictionary)).status, 403);
        for (const body of [
          { ...dictionary, code: 'Bad Code' },
          { ...dictionary, name: ' ' },
          { ...dictionary, isActive: 'true' },
          { ...dictionary, remark: null },
        ]) {
          assert.equal((await call('', tenantA, 'POST', body)).status, 400);
        }
        assert.equal((await call('', tenantA, 'POST', dictionary)).status, 201);
        assert.equal((await call('', tenantA, 'POST', dictionary)).status, 409);
        assert.equal((await call('?pageSize=101', tenantA)).status, 400);
        assert.equal(
          (
            await call('/customer_source/items', tenantA, 'POST', {
              ...item,
              sortOrder: 1.5,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call('/customer_source/items', tenantA, 'POST', {
              ...item,
              color: 'invalid',
            })
          ).status,
          400,
        );
        assert.equal(
          (await call('/customer_source/items', tenantA, 'POST', item)).status,
          201,
        );
        assert.equal(
          (await call('/customer_source/items', tenantA, 'POST', item)).status,
          409,
        );
      },
    );

    await t.test(
      'types, items, searches and foreign keys are tenant isolated',
      async () => {
        assert.equal((await call('/customer_source', tenantB)).status, 404);
        assert.equal(
          (
            await call('', tenantB, 'POST', {
              ...dictionary,
              name: 'B 企业来源',
            })
          ).status,
          201,
        );
        const aItem = (await detail(tenantA)).items[0];
        assert.equal(
          (
            await call(
              `/customer_source/items/${aItem.id}`,
              tenantB,
              'PATCH',
              item,
            )
          ).status,
          404,
        );
        assert.equal(
          (await call('/other', tenantA, 'POST', dictionary)).status,
          404,
        );
        assert.equal(
          (await call('', tenantA, 'POST', { ...dictionary, code: 'other' }))
            .status,
          201,
        );
        assert.equal(
          (await call(`/other/items/${aItem.id}`, tenantA, 'PATCH', item))
            .status,
          404,
        );
        const aType = await prisma.dictionaryType.findUniqueOrThrow({
          where: { tenantId_code: { tenantId: a.id, code: dictionary.code } },
        });
        await assert.rejects(
          prisma.dictionaryItem.create({
            data: {
              tenantId: b.id,
              dictionaryId: aType.id,
              value: 'forged',
              label: 'forged',
            },
          }),
        );
        const result = (await (
          await call('?keyword=customer', tenantA)
        ).json()) as { total: number; data: { name: string }[] };
        assert.equal(result.total, 1);
        assert.equal(result.data[0].name, dictionary.name);
        assert.equal(
          (
            await call('/customer_source', tenantA, 'GET', undefined, {
              'X-Tenant-ID': b.id.toString(),
            })
          ).status,
          403,
        );
      },
    );

    await t.test(
      'immutable codes and values survive updates; disabled options remain readable',
      async () => {
        const aItem = (await detail(tenantA)).items[0];
        assert.equal(
          (
            await call('/customer_source', tenantA, 'PATCH', {
              ...dictionary,
              code: 'renamed',
              name: '获客渠道',
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await call(`/customer_source/items/${aItem.id}`, tenantA, 'PATCH', {
              ...item,
              value: 'changed',
              label: '客户推荐',
              isActive: false,
            })
          ).status,
          200,
        );
        assert.equal((await call('/renamed', tenantA)).status, 404);
        const current = await detail(member);
        assert.equal(current.code, dictionary.code);
        assert.equal(current.name, '获客渠道');
        assert.equal(current.items[0].value, item.value);
        assert.equal(current.items[0].label, '客户推荐');
        assert.equal(current.items[0].isActive, false);
        assert.equal(
          (await call('/customer_source/items/-1', tenantA, 'PATCH', item))
            .status,
          400,
        );
        assert.equal(
          (
            await call(
              '/customer_source/items/9223372036854775808',
              tenantA,
              'PATCH',
              item,
            )
          ).status,
          400,
        );
        assert.equal(
          (await call('/customer_source', member, 'PATCH', dictionary)).status,
          403,
        );
      },
    );

    await t.test(
      'business transaction validation preserves existing inactive values and rejects new invalid values',
      async () => {
        const service = app?.get(DictionariesService);
        assert(service);
        const session: SessionContext = {
          userid: '1',
          name: 'test',
          access: 'admin',
          isPlatformAdmin: false,
          tenant: { id: a.id.toString(), code: a.code, name: a.name },
        };
        const validate = (
          values: string[],
          previous: string[] = [],
          context = session,
        ) =>
          prisma.$transaction((tx) =>
            service.validateValues(
              tx,
              context,
              { scope: 'tenant', code: dictionary.code },
              values,
              previous,
            ),
          );
        await validate(['referral'], ['referral']);
        await validate([]);
        await assert.rejects(validate(['referral']));
        await assert.rejects(validate(['missing'], ['missing']));
        await assert.rejects(validate(['referral', 'referral'], ['referral']));
        await assert.rejects(
          validate(['referral'], [], {
            ...session,
            tenant: { id: b.id.toString(), code: b.code, name: b.name },
          }),
        );
        assert.equal(
          (
            await call('/customer_source/items', tenantA, 'POST', {
              ...item,
              value: 'web',
              sortOrder: 10,
            })
          ).status,
          201,
        );
        await validate(['web']);
        assert.equal((await detail(tenantA)).items[0].value, 'web');
        assert.equal(
          (
            await call('/customer_source', tenantA, 'PATCH', {
              ...dictionary,
              isActive: false,
            })
          ).status,
          200,
        );
        await assert.rejects(validate(['web']));
        await validate(['web'], ['web']);
        assert.equal((await detail(member)).items.length, 2);
      },
    );

    await t.test(
      'custom role grants and feature revocation apply immediately',
      async () => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: 'tenant-a-user' },
        });
        const role = await prisma.tenantRole.create({
          data: {
            tenantId: a.id,
            name: '字典查看员',
            permissions: ['dictionaries:read'],
          },
        });
        await prisma.memberRole.create({
          data: { tenantId: a.id, userId: user.id, roleId: role.id },
        });
        assert.equal((await call('', member)).status, 200);
        assert.equal(
          (await call('', member, 'POST', { ...dictionary, code: 'role_test' }))
            .status,
          403,
        );
        await prisma.tenantRole.update({
          where: { id: role.id },
          data: { permissions: ['dictionaries:read', 'dictionaries:create'] },
        });
        assert.equal(
          (await call('', member, 'POST', { ...dictionary, code: 'role_test' }))
            .status,
          201,
        );
        assert.equal(
          (await call('/customer_source', member, 'PATCH', dictionary)).status,
          403,
        );
        await prisma.tenantRole.update({
          where: { id: role.id },
          data: { permissions: ['dictionaries:read', 'dictionaries:update'] },
        });
        assert.equal(
          (await call('/customer_source', member, 'PATCH', dictionary)).status,
          200,
        );
        await prisma.tenantFeature.delete({
          where: {
            tenantId_featureCode: {
              tenantId: a.id,
              featureCode: 'dictionaries',
            },
          },
        });
        assert.equal((await call('', tenantA)).status, 403);
        assert.equal((await call('/customer_source', member)).status, 403);
      },
    );
    await t.test(
      'platform dictionaries are readable without tenant feature access and editable only in a platform session',
      async () => {
        const path = '/api/platform/dictionaries';
        assert.equal(
          (await api('/api/dictionaries/platform/industry')).status,
          401,
        );
        assert.equal((await api(path)).status, 401);
        for (const cookie of [tenantA, tenantB, member]) {
          assert.equal((await api(path, cookie)).status, 403);
          assert.equal(
            (await api(path, cookie, 'POST', dictionary)).status,
            403,
          );
          assert.equal(
            (
              await api(`${path}/industry`, cookie, 'PATCH', {
                ...dictionary,
                revision: 0,
              })
            ).status,
            403,
          );
          assert.equal(
            (await api(`${path}/industry/items`, cookie, 'POST', item)).status,
            403,
          );
          assert.equal(
            (
              await api(`${path}/industry/items/1`, cookie, 'PATCH', {
                ...item,
                revision: 0,
              })
            ).status,
            403,
          );
          assert.equal(
            (await api(`${path}/industry/history`, cookie)).status,
            403,
          );
          assert.equal((await shared(cookie, 'industry')).items.length, 6);
        }
        assert.equal((await api(path, platform)).status, 200);
        assert.equal((await api(`${path}?pageSize=101`, platform)).status, 400);
        assert.equal(
          (await api(path, platform, 'POST', dictionary)).status,
          201,
        );
        assert.equal(
          (await api(path, platform, 'POST', dictionary)).status,
          409,
        );
        assert.equal(
          (await api(`${path}/customer_source/items`, platform, 'POST', item))
            .status,
          201,
        );
        assert.equal(
          (await api(`${path}/customer_source/items`, platform, 'POST', item))
            .status,
          409,
        );
        assert.equal((await shared(member)).items[0].label, item.label);
        assert.equal((await detail(tenantB)).name, 'B 企业来源');
        assert.equal((await detail(tenantB)).items.length, 0);
      },
    );

    await t.test(
      'platform updates retain codes and values, reject stale versions and atomically record only successful changes',
      async () => {
        const path = '/api/platform/dictionaries/customer_source';
        const current = await shared(platform);
        const option = current.items[0];
        assert.equal(
          (await api(`${path}/items/${option.id}`, platform, 'PATCH', item))
            .status,
          400,
        );
        assert.equal(
          (
            await api(`${path}/items/9223372036854775808`, platform, 'PATCH', {
              ...item,
              revision: 0,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api(
              `/api/platform/dictionaries/industry/items/${option.id}`,
              platform,
              'PATCH',
              { ...item, revision: 0 },
            )
          ).status,
          404,
        );
        const update = {
          ...item,
          value: 'forged-new-value',
          label: '平台客户推荐',
          isActive: false,
          revision: option.revision,
        };
        assert.equal(
          (await api(`${path}/items/${option.id}`, platform, 'PATCH', update))
            .status,
          200,
        );
        assert.equal(
          (await api(`${path}/items/${option.id}`, platform, 'PATCH', update))
            .status,
          409,
        );
        const concurrent = await Promise.all([
          api(path, platform, 'PATCH', {
            ...dictionary,
            code: 'renamed',
            name: '平台渠道 A',
            revision: current.revision,
          }),
          api(path, platform, 'PATCH', {
            ...dictionary,
            code: 'renamed',
            name: '平台渠道 B',
            revision: current.revision,
          }),
        ]);
        assert.deepEqual(
          concurrent.map((response) => response.status).sort(),
          [200, 409],
        );
        const after = await shared(member);
        assert.equal(after.code, dictionary.code);
        assert.equal(after.revision, 1);
        assert.equal(after.items[0].value, item.value);
        assert.equal(after.items[0].label, '平台客户推荐');
        assert.equal(after.items[0].isActive, false);
        assert.equal(after.items[0].revision, 1);
        assert.equal(
          (await api('/api/dictionaries/platform/renamed', member)).status,
          404,
        );
        const auditResponse = await api(`${path}/history`, platform);
        assert.equal(auditResponse.status, 200);
        const history =
          (await auditResponse.json()) as DictionaryAuditListResponseDto;
        assert.equal(history.total, 4);
        assert(history.data.every((event) => event.actorName === '平台管理员'));
        const itemChange = history.data.find(
          (event) => event.entityType === 'item' && event.action === 'update',
        );
        assert(itemChange);
        assert.equal(itemChange.before.label, item.label);
        assert.equal(itemChange.after.label, '平台客户推荐');
        assert.equal(itemChange.after.isActive, false);
        const tenantHistory = await call('/customer_source/history', tenantB);
        assert.equal(tenantHistory.status, 200);
        const tenantEvents =
          (await tenantHistory.json()) as DictionaryAuditListResponseDto;
        assert.equal(tenantEvents.total, 1);
        assert.equal(tenantEvents.data[0].after.name, 'B 企业来源');
        assert.equal((await call('/other/history', tenantB)).status, 404);
      },
    );

    await t.test(
      'real tenant industry writes validate platform options and preserve persisted inactive values',
      async () => {
        const tenantPath = `/api/platform/tenants/${a.id}`;
        const body = { name: a.name, isActive: true, industry: 'it' };
        assert.equal(
          (
            await api(tenantPath, platform, 'PATCH', {
              ...body,
              industry: 'missing',
              previousValues: ['missing'],
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api(tenantPath, platform, 'PATCH', {
              ...body,
              industry: null,
            })
          ).status,
          400,
        );
        assert.equal(
          (await api(tenantPath, platform, 'PATCH', body)).status,
          200,
        );
        assert.equal(
          (await prisma.tenant.findUniqueOrThrow({ where: { id: a.id } }))
            .industry,
          'it',
        );
        const industry = await shared(member, 'industry');
        const it = industry.items.find((entry) => entry.value === 'it');
        assert(it);
        assert.equal(
          (
            await api(
              `/api/platform/dictionaries/industry/items/${it.id}`,
              platform,
              'PATCH',
              { ...it, isActive: false },
            )
          ).status,
          200,
        );
        assert.equal(
          (await api(tenantPath, platform, 'PATCH', body)).status,
          200,
        );
        assert.equal(
          (
            await api(tenantPath, platform, 'PATCH', {
              name: a.name,
              isActive: true,
            })
          ).status,
          200,
        );
        assert.equal(
          (await prisma.tenant.findUniqueOrThrow({ where: { id: a.id } }))
            .industry,
          'it',
        );
        assert.equal(
          (
            await api(`/api/platform/tenants/${b.id}`, platform, 'PATCH', {
              name: b.name,
              isActive: true,
              industry: 'it',
              previousValues: ['it'],
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api('/api/platform/tenants', platform, 'POST', {
              code: 'invalid-industry',
              name: 'Invalid',
              industry: 'it',
              admin: { mode: 'existing', username: 'admin' },
            })
          ).status,
          400,
        );
        assert.equal(
          await prisma.tenant.count({ where: { code: 'invalid-industry' } }),
          0,
        );
        assert.equal(
          (await shared(member, 'industry')).items.find(
            (entry) => entry.value === 'it',
          )?.label,
          it.label,
        );
        assert.equal(
          (
            await api(
              '/api/platform/dictionaries/industry',
              platform,
              'PATCH',
              { ...industry, isActive: false },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await api(`/api/platform/tenants/${b.id}`, platform, 'PATCH', {
              name: b.name,
              isActive: true,
              industry: 'finance',
            })
          ).status,
          400,
        );
        assert.equal(
          (await api(tenantPath, platform, 'PATCH', body)).status,
          200,
        );
        assert.equal(
          (await api(tenantPath, platform, 'PATCH', { ...body, industry: '' }))
            .status,
          200,
        );
        assert.equal(
          (await prisma.tenant.findUniqueOrThrow({ where: { id: a.id } }))
            .industry,
          '',
        );
        assert.equal(
          (await api(tenantPath, platform, 'PATCH', body)).status,
          400,
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
