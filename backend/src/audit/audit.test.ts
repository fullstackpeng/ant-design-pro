import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { AppModule } from '../app.module.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';
import { AuditCleanupService } from './audit-cleanup.service.js';

test('audit lifecycle, tenant isolation, transaction integrity and retention on PostgreSQL', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({
    connectionString: originalUrl,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
  });
  const schema = `audit_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'audit-test-password';
  async function api(
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
        'User-Agent': 'AuditTest/1',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function login(tenantCode: string, username: string) {
    const response = await api('/api/login/account', '', 'POST', {
      tenantCode,
      username,
      password,
    });
    assert.equal(response.status, 200, await response.text());
    return (response.headers.get('set-cookie') ?? '').split(';')[0];
  }
  async function settle() {
    await setTimeout(100);
  }
  try {
    const client = await admin.connect();
    try {
      await client.query(`SET search_path TO ${schema}`);
      for (const migration of (
        await readdir(resolve('prisma/migrations'), { withFileTypes: true })
      )
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
      await client.query('ROLLBACK');
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
    const tenantA = await login('tenant-a', 'admin');
    const tenantB = await login('tenant-b', 'tenant-b-user');
    const member = await login('tenant-a', 'tenant-a-user');
    const a = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-a' },
    });
    const b = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-b' },
    });

    await t.test(
      'records login success, failed attempts, logout and safe snapshots',
      async () => {
        const failed = await api('/api/login/account', '', 'POST', {
          tenantCode: 'tenant-a',
          username: 'missing-account',
          password: 'secret-password-marker',
        });
        assert.equal(failed.status, 401);
        const row = await prisma.loginLog.findFirstOrThrow({
          where: { attemptedAccount: 'missing-account' },
        });
        assert.equal(row.result, 'failed');
        assert.equal(row.actorId, null);
        assert.equal(row.tenantId, a.id);
        assert(
          !JSON.stringify(row, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          ).includes('secret-password-marker'),
        );
        const temp = await login('tenant-a', 'admin');
        assert.equal(
          (await api('/api/login/outLogin', temp, 'POST')).status,
          200,
        );
        assert(
          await prisma.loginLog.findFirst({
            where: {
              eventCode: 'auth.logout',
              tenantId: a.id,
              result: 'succeeded',
            },
          }),
        );
      },
    );

    await t.test(
      'ordinary mutations commit with one business event and before/after snapshots',
      async () => {
        const created = await api('/api/platform/plans', platform, 'POST', {
          code: 'audit-plan',
          isActive: true,
          name: 'Audit Plan',
          maxMembers: 20,
          maxStorageMb: 5120,
          maxFileSizeMb: 100,
        });
        assert.equal(created.status, 201, await created.text());
        const plan = await prisma.plan.findUniqueOrThrow({
          where: { code: 'audit-plan' },
        });
        const events = await prisma.operationLog.findMany({
          where: { eventCode: 'plans.create', targetId: plan.id.toString() },
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].result, 'succeeded');
        assert.equal(events[0].targetName, 'Audit Plan');
        const changed = await api(
          `/api/platform/plans/${plan.id}`,
          platform,
          'PATCH',
          {
            name: 'Updated Plan',
            maxMembers: 20,
            maxStorageMb: 5120,
            maxFileSizeMb: 100,
            isActive: true,
          },
        );
        assert.equal(changed.status, 200, await changed.text());
        const event = await prisma.operationLog.findFirstOrThrow({
          where: { eventCode: 'plans.update' },
        });
        assert(JSON.stringify(event.changes).includes('Audit Plan'));
        assert(JSON.stringify(event.changes).includes('Updated Plan'));
      },
    );

    await t.test(
      'audit persistence failure rolls back a critical business mutation',
      async () => {
        const client = await admin.connect();
        try {
          await client.query(`SET search_path TO ${schema}`);
          await client.query(
            `CREATE FUNCTION reject_audit_success() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_code = 'plans.create' AND NEW.result = 'succeeded' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`,
          );
          await client.query(
            'CREATE TRIGGER reject_audit_success BEFORE INSERT ON app_operation_logs FOR EACH ROW EXECUTE FUNCTION reject_audit_success()',
          );
          assert.equal(
            (
              await api('/api/platform/plans', platform, 'POST', {
                code: 'rolled-back',
                isActive: true,
                name: 'Rollback',
                maxMembers: 20,
                maxStorageMb: 5120,
                maxFileSizeMb: 100,
              })
            ).status,
            500,
          );
          assert.equal(
            await prisma.plan.count({ where: { code: 'rolled-back' } }),
            0,
          );
          assert.equal(
            await prisma.operationLog.count({
              where: {
                eventCode: 'plans.create',
                targetName: 'Rollback',
                result: 'succeeded',
              },
            }),
            0,
          );
        } finally {
          await client.query(
            'DROP TRIGGER IF EXISTS reject_audit_success ON app_operation_logs',
          );
          await client.query('DROP FUNCTION IF EXISTS reject_audit_success()');
          await client.query('RESET search_path');
          client.release();
        }
      },
    );

    await t.test(
      'guard and validation rejections are recorded without leaking request payloads',
      async () => {
        const denied = await api('/api/tenant/positions', member, 'POST', {
          code: 'denied',
          name: 'No permission',
        });
        assert.equal(denied.status, 403);
        const invalid = await api('/api/platform/plans', platform, 'POST', {
          password: 'invalid-body-secret-marker',
        });
        assert.equal(invalid.status, 400);
        await settle();
        assert(
          await prisma.operationLog.findFirst({
            where: {
              requestId: denied.headers.get('x-request-id') ?? '',
              result: 'denied',
              tenantId: a.id,
            },
          }),
        );
        const event = await prisma.operationLog.findFirstOrThrow({
          where: { requestId: invalid.headers.get('x-request-id') ?? '' },
        });
        assert.equal(event.result, 'failed');
        assert(
          !JSON.stringify(event.changes).includes('invalid-body-secret-marker'),
        );
      },
    );

    await t.test(
      'tenant lists and details enforce scope and ordinary members have no default access',
      async () => {
        const created = await api('/api/tenant/positions', tenantB, 'POST', {
          code: 'b-audit',
          name: 'Tenant B position',
          sortOrder: 0,
          isActive: true,
        });
        assert.equal(created.status, 201, await created.text());
        const row = await prisma.operationLog.findFirstOrThrow({
          where: { tenantId: b.id, eventCode: 'positions.create' },
        });
        assert.equal(
          (await api(`/api/tenant/audit/operation-logs/${row.id}`, tenantA))
            .status,
          404,
        );
        assert.equal(
          (await api('/api/tenant/audit/operation-logs', member)).status,
          403,
        );
        assert.equal(
          (
            await api(
              `/api/tenant/audit/operation-logs?tenantId=${b.id}`,
              tenantA,
            )
          ).status,
          403,
        );
        const tenantRows = (await (
          await api('/api/tenant/audit/operation-logs', tenantA)
        ).json()) as { data: { tenantId: string; scope: string }[] };
        assert(
          tenantRows.data.every(
            (entry) =>
              entry.tenantId === a.id.toString() && entry.scope === 'tenant',
          ),
        );
        assert.equal(
          (await api(`/api/platform/audit/operation-logs/${row.id}`, platform))
            .status,
          200,
        );
        assert.equal(
          (
            await api(
              '/api/tenant/audit/operation-logs?startAt=2026-12-01T00:00:00Z&endAt=2026-01-01T00:00:00Z',
              tenantA,
            )
          ).status,
          400,
        );
      },
    );

    await t.test(
      'audit viewing can be delegated per page and feature revocation does not disable recording',
      async () => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: 'tenant-a-user' },
        });
        const role = await prisma.tenantRole.create({
          data: {
            tenantId: a.id,
            name: '审计只读',
            permissions: ['audit:operation:read'],
          },
        });
        await prisma.memberRole.create({
          data: { tenantId: a.id, userId: user.id, roleId: role.id },
        });
        assert.equal(
          (await api('/api/tenant/audit/operation-logs', member)).status,
          200,
        );
        assert.equal(
          (await api('/api/tenant/audit/login-logs', member)).status,
          403,
        );
        await prisma.tenantFeature.delete({
          where: {
            tenantId_featureCode: { tenantId: a.id, featureCode: 'audit' },
          },
        });
        assert.equal(
          (await api('/api/tenant/audit/operation-logs', tenantA)).status,
          403,
        );
        const created = await api('/api/tenant/positions', tenantA, 'POST', {
          code: 'audit-feature-off',
          name: '审计不可见时仍采集',
          sortOrder: 0,
          isActive: true,
        });
        assert.equal(created.status, 201, await created.text());
        assert(
          await prisma.operationLog.findFirst({
            where: {
              requestId: created.headers.get('x-request-id') ?? '',
              result: 'succeeded',
            },
          }),
        );
        await prisma.tenantFeature.create({
          data: { tenantId: a.id, featureCode: 'audit' },
        });
      },
    );

    await t.test(
      'retention is private, versioned, validated, audited and cleans both tables by event time',
      async () => {
        const policy = (await (
          await api('/api/platform/audit/policy', platform)
        ).json()) as {
          data: { operationDays: number; loginDays: number; revision: number };
        };
        assert.equal(policy.data.operationDays, 180);
        assert.equal(policy.data.loginDays, 180);
        assert.equal(
          (
            await api('/api/platform/audit/policy', tenantA, 'PATCH', {
              operationDays: 1,
              loginDays: 1,
              revision: 0,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await api('/api/platform/audit/policy', platform, 'PATCH', {
              operationDays: 0,
              loginDays: 1,
              revision: 0,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api('/api/platform/audit/policy', platform, 'PATCH', {
              operationDays: 1,
              loginDays: 2,
              revision: 0,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await api('/api/platform/audit/policy', platform, 'PATCH', {
              operationDays: 3,
              loginDays: 3,
              revision: 0,
            })
          ).status,
          409,
        );
        const publicSettings = await (await api('/api/site-settings')).text();
        assert(!publicSettings.includes('operationDays'));
        const baseEvent = {
          eventId: randomUUID(),
          eventCode: 'test.old',
          module: 'test',
          action: '旧日志',
          scope: 'platform',
          result: 'succeeded',
          requestId: randomUUID(),
          changes: [],
        };
        const old = await prisma.operationLog.create({
          data: {
            ...baseEvent,
            createdAt: new Date(Date.now() - 2 * 86400000),
          },
        });
        const loginOld = await prisma.loginLog.create({
          data: {
            ...baseEvent,
            eventId: randomUUID(),
            createdAt: new Date(Date.now() - 3 * 86400000),
          },
        });
        const loginKeep = await prisma.loginLog.create({
          data: {
            ...baseEvent,
            eventId: randomUUID(),
            createdAt: new Date(Date.now() - 86400000),
          },
        });
        await app?.get(AuditCleanupService).cleanup();
        assert.equal(
          await prisma.operationLog.findUnique({ where: { id: old.id } }),
          null,
        );
        assert.equal(
          await prisma.loginLog.findUnique({ where: { id: loginOld.id } }),
          null,
        );
        assert(
          await prisma.loginLog.findUnique({ where: { id: loginKeep.id } }),
        );
        assert(
          await prisma.operationLog.findFirst({
            where: { eventCode: 'audit.policy.update', result: 'succeeded' },
          }),
        );
        assert(
          await prisma.operationLog.findFirst({
            where: { eventCode: 'audit.retention.cleanup' },
          }),
        );
      },
    );
  } finally {
    await app?.close();
    await prisma.$disconnect();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  }
});
