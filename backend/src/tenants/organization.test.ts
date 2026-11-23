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

test('tenant organization: ownership, tree, assignments, permissions and lifecycle', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({ connectionString: originalUrl });
  const schema = `organization_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  const password = 'organization-test-password';

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

    const adminA = await login('tenant-a', 'admin');
    const adminB = await login('tenant-b', 'tenant-b-user');
    const userA = await login('tenant-a', 'tenant-a-user');
    const platform = await login('platform', 'platform-admin');
    const tenantA = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-a' },
    });
    const tenantB = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-b' },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: 'tenant-a-user' },
    });
    const path = `/api/tenant/members/${user.id}`;
    const record = { code: 'root', name: 'Root', sortOrder: 0, isActive: true };
    const childBody = { ...record, code: 'child', name: 'Child' };
    const positionBody = { ...record, code: 'engineer', name: 'Engineer' };

    async function expectStatus(
      route: string,
      cookie: string,
      method: string,
      body: unknown,
      status: number,
    ) {
      const response = await api(route, cookie, method, body);
      assert.equal(response.status, status, await response.clone().text());
      return response.json();
    }
    async function list(route: string, cookie = adminA) {
      const response = await api(route, cookie);
      assert.equal(response.status, 200, await response.clone().text());
      return response.json();
    }

    await t.test(
      'CRUD permissions, duplicate codes and tenant isolation',
      async () => {
        await expectStatus(
          '/api/tenant/departments',
          userA,
          'POST',
          record,
          403,
        );
        await expectStatus(
          '/api/tenant/positions',
          platform,
          'POST',
          positionBody,
          403,
        );
        await expectStatus(
          '/api/tenant/departments',
          adminA,
          'POST',
          record,
          201,
        );
        await expectStatus(
          '/api/tenant/departments',
          adminA,
          'POST',
          record,
          409,
        );
        await expectStatus(
          '/api/tenant/departments',
          adminB,
          'POST',
          record,
          201,
        );
        assert.equal((await list('/api/tenant/departments')).data.length, 1);
        assert.equal(
          (await list('/api/tenant/departments', adminB)).data.length,
          1,
        );
        await expectStatus(
          '/api/tenant/positions',
          adminA,
          'POST',
          positionBody,
          201,
        );
        await expectStatus(
          '/api/tenant/positions',
          adminA,
          'POST',
          positionBody,
          409,
        );
        await expectStatus(
          '/api/tenant/positions',
          adminA,
          'POST',
          { ...positionBody, code: 'manager' },
          201,
        );
      },
    );

    const root = (await list('/api/tenant/departments')).data[0];
    const otherRoot = (await list('/api/tenant/departments', adminB)).data[0];
    await expectStatus(
      '/api/tenant/departments',
      adminA,
      'POST',
      { ...childBody, parentId: root.id },
      201,
    );
    const child = (await list('/api/tenant/departments')).data.find(
      (row: { code: string }) => row.code === 'child',
    );
    const positions = (await list('/api/tenant/positions')).data;
    const positionIds = positions.map((row: { id: string }) => row.id);
    const update = {
      role: 'user',
      isActive: true,
      departmentId: child.id,
      positionIds,
    };

    await t.test(
      'department cycles, parent isolation and referenced deletion are rejected',
      async () => {
        await expectStatus(
          `/api/tenant/departments/${root.id}`,
          adminA,
          'PATCH',
          { ...record, parentId: child.id },
          409,
        );
        await expectStatus(
          `/api/tenant/departments/${root.id}`,
          adminA,
          'PATCH',
          { ...record, parentId: root.id },
          409,
        );
        await expectStatus(
          '/api/tenant/departments',
          adminA,
          'POST',
          { ...record, code: 'foreign', parentId: otherRoot.id },
          404,
        );
        await expectStatus(
          `/api/tenant/departments/${root.id}`,
          adminA,
          'DELETE',
          undefined,
          409,
        );
        await expectStatus(
          `/api/tenant/departments/${root.id}`,
          adminB,
          'DELETE',
          undefined,
          404,
        );
      },
    );

    await t.test(
      'single department, multiple positions, filters and assignment isolation',
      async () => {
        await expectStatus(path, adminA, 'PATCH', update, 200);
        const members = await list(
          `/api/tenant/members?departmentId=${root.id}`,
        );
        assert.equal(members.total, 1);
        assert.equal(members.data[0].department.id, child.id);
        assert.equal(members.data[0].positions.length, 2);
        assert.equal(
          (await list(`/api/tenant/members?positionId=${positionIds[0]}`))
            .total,
          1,
        );
        assert.equal(
          (await list('/api/tenant/members?departmentId=unassigned')).total,
          1,
        );
        assert.equal(
          (await list('/api/tenant/members?positionId=unassigned')).total,
          1,
        );
        await expectStatus(
          path,
          adminA,
          'PATCH',
          { ...update, departmentId: otherRoot.id },
          403,
        );
        const foreignPosition = await prisma.tenantPosition.create({
          data: { tenantId: tenantB.id, ...positionBody },
        });
        await expectStatus(
          path,
          adminA,
          'PATCH',
          { ...update, positionIds: [String(foreignPosition.id)] },
          403,
        );
        await expectStatus(
          path,
          adminA,
          'PATCH',
          { ...update, positionIds: [positionIds[0], positionIds[0]] },
          400,
        );
        await expectStatus(
          '/api/tenant/members?departmentId=bad',
          adminA,
          'GET',
          undefined,
          400,
        );
        await expectStatus(
          '/api/tenant/members?positionId=9223372036854775808',
          adminA,
          'GET',
          undefined,
          400,
        );
        await expectStatus(
          `/api/tenant/departments/${child.id}`,
          adminA,
          'DELETE',
          undefined,
          409,
        );
        await expectStatus(
          `/api/tenant/positions/${positionIds[0]}`,
          adminA,
          'DELETE',
          undefined,
          409,
        );
        await assert.rejects(
          prisma.tenantMembership.update({
            where: {
              tenantId_userId: { tenantId: tenantA.id, userId: user.id },
            },
            data: { departmentId: BigInt(otherRoot.id) },
          }),
        );
        await assert.rejects(
          prisma.memberPosition.create({
            data: {
              tenantId: tenantA.id,
              userId: user.id,
              positionId: foreignPosition.id,
            },
          }),
        );
      },
    );

    await t.test(
      'disabled assignments are retained, cannot be newly assigned and can be cleared',
      async () => {
        await expectStatus(
          `/api/tenant/departments/${child.id}`,
          adminA,
          'PATCH',
          { ...childBody, parentId: root.id, isActive: false },
          200,
        );
        for (const position of positions)
          await expectStatus(
            `/api/tenant/positions/${position.id}`,
            adminA,
            'PATCH',
            { ...position, isActive: false, id: undefined },
            200,
          );
        await expectStatus(path, adminA, 'PATCH', update, 200);
        await expectStatus(
          path,
          adminA,
          'PATCH',
          { role: 'user', isActive: true },
          200,
        );
        assert.equal(
          (await list(`/api/tenant/members?departmentId=${root.id}`)).total,
          1,
        );
        await expectStatus(
          path,
          adminA,
          'PATCH',
          { ...update, departmentId: null, positionIds: [] },
          200,
        );
        await expectStatus(path, adminA, 'PATCH', update, 403);
        const current = (await list('/api/tenant/members')).data.find(
          (row: { userId: string }) => row.userId === String(user.id),
        );
        assert.equal(current.department, null);
        assert.deepEqual(current.positions, []);
      },
    );

    await t.test(
      'member editors can assign organization without gaining organization management or role rights',
      async () => {
        const role = await prisma.tenantRole.create({
          data: {
            tenantId: tenantA.id,
            name: 'Member editor',
            permissions: ['members:read', 'members:create', 'members:update'],
          },
        });
        await prisma.memberRole.create({
          data: { tenantId: tenantA.id, userId: user.id, roleId: role.id },
        });
        const options = await list(
          '/api/tenant/members/organization-options',
          userA,
        );
        assert.equal(options.data.departments.length, 2);
        assert.equal(options.data.positions.length, 2);
        await expectStatus(
          '/api/tenant/departments',
          userA,
          'GET',
          undefined,
          403,
        );
        await expectStatus(
          '/api/tenant/positions',
          userA,
          'GET',
          undefined,
          403,
        );
        const admin = await prisma.user.findUniqueOrThrow({
          where: { username: 'admin' },
        });
        await expectStatus(
          `/api/tenant/members/${admin.id}`,
          userA,
          'PATCH',
          { role: 'admin', isActive: true, departmentId: root.id },
          403,
        );
        await expectStatus(
          path,
          userA,
          'PATCH',
          { role: 'user', isActive: true, departmentId: root.id, roleIds: [] },
          403,
        );
        await expectStatus(
          path,
          userA,
          'PATCH',
          { role: 'user', isActive: true, departmentId: root.id },
          200,
        );
        await expectStatus(
          '/api/tenant/members',
          userA,
          'POST',
          {
            mode: 'new',
            username: 'org-new',
            name: 'New',
            password,
            role: 'user',
            departmentId: root.id,
            positionIds: [],
          },
          201,
        );
        await expectStatus(
          '/api/tenant/members',
          userA,
          'POST',
          {
            mode: 'new',
            username: 'org-invalid',
            name: 'Invalid',
            password,
            role: 'user',
            departmentId: child.id,
            positionIds: [],
          },
          403,
        );
        assert.equal(
          await prisma.user.count({ where: { username: 'org-invalid' } }),
          0,
        );
        // Authorization remains role based regardless of the assigned department.
        assert.deepEqual(
          (
            await prisma.tenantRole.findUniqueOrThrow({
              where: { id: role.id },
            })
          ).permissions,
          ['members:read', 'members:create', 'members:update'],
        );
      },
    );

    await t.test(
      'clear assignments before deleting and remove links with membership',
      async () => {
        const created = await prisma.user.findUniqueOrThrow({
          where: { username: 'org-new' },
        });
        await expectStatus(
          `/api/tenant/members/${created.id}`,
          adminA,
          'DELETE',
          undefined,
          200,
        );
        await expectStatus(
          path,
          adminA,
          'PATCH',
          { role: 'user', isActive: true, departmentId: null, positionIds: [] },
          200,
        );
        await expectStatus(
          `/api/tenant/departments/${child.id}`,
          adminA,
          'DELETE',
          undefined,
          200,
        );
        await expectStatus(
          `/api/tenant/departments/${root.id}`,
          adminA,
          'DELETE',
          undefined,
          200,
        );
        for (const position of positions)
          await expectStatus(
            `/api/tenant/positions/${position.id}`,
            adminA,
            'DELETE',
            undefined,
            200,
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
