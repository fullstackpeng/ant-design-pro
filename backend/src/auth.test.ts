import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { createPool, initializeDatabase } from './database.js';

test('real PostgreSQL authentication lifecycle', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const adminPool = createPool();
  const schema = `auth_test_${randomBytes(8).toString('hex')}`;
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  const pool = createPool();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let baseUrl = '';
  let cookie = '';

  async function start() {
    app = await NestFactory.create(AppModule, {
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
    username: 'admin',
    password: 'test-password',
    type: 'account',
    autoLogin: true,
  };

  try {
    await initializeDatabase(pool, credentials.password);
    await initializeDatabase(pool, 'must-not-reset-existing-password');
    await start();

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
        assert.equal((await currentUser('antd_session=invalid')).status, 401);
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
        ]) {
          assert.equal((await login(body)).status, 400);
        }
        for (const body of [
          { ...credentials, password: 'wrong' },
          { ...credentials, username: "admin' OR '1'='1" },
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
          'name',
          'userid',
        ]);
        const users = await pool.query('SELECT password_hash FROM app_users');
        assert.notEqual(users.rows[0].password_hash, credentials.password);
        const sessions = await pool.query(
          'SELECT token_hash FROM app_sessions',
        );
        const token = cookie.split('=')[1];
        assert.notEqual(sessions.rows[0].token_hash, token);
        assert.equal(
          sessions.rows[0].token_hash,
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
        await pool.query(
          "UPDATE app_sessions SET expires_at = NOW() - INTERVAL '1 second'",
        );
        assert.equal((await currentUser()).status, 401);
      },
    );
  } finally {
    await app?.close();
    await pool.end();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
    await adminPool.end();
  }
});
