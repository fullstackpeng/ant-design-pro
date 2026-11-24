import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import net, { type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { Aedes } from 'aedes';
import cookieParser from 'cookie-parser';
import { connect, type MqttClient } from 'mqtt';
import { Pool } from 'pg';
import { WebSocket } from 'ws';
import { AppModule } from '../app.module.js';
import { encryptSecrets } from '../common/secret-box.js';
import { createPrismaClient } from '../database/prisma.factory.js';
import { seedDemoData } from '../database/seed.js';

type Frame = Record<string, unknown>;

function openSocket(url: string, cookie: string): Promise<WebSocket> {
  return new Promise((resolveSocket, reject) => {
    const socket = new WebSocket(url, { headers: { Cookie: cookie } });
    socket.once('open', () => resolveSocket(socket));
    socket.once('error', reject);
  });
}

function nextFrame(socket: WebSocket, timeoutMs = 3000): Promise<Frame> {
  return new Promise((resolveFrame, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for a WebSocket frame'));
    }, timeoutMs);
    const onMessage = (data: unknown) => {
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolveFrame(JSON.parse(String(data)) as Frame);
    };
    socket.on('message', onMessage);
  });
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  return false;
}

test('mqtt bridge, tenant brokers and credential reveal', async (t) => {
  const originalUrl = process.env.DATABASE_URL;
  const originalSecret = process.env.SECRET_ENCRYPTION_KEY;
  const originalProvisionPoll = process.env.MQTT_PROVISION_POLL_MS;
  const originalOutboxPoll = process.env.MQTT_OUTBOX_POLL_MS;
  process.env.SECRET_ENCRYPTION_KEY ??= randomBytes(32).toString('base64');
  process.env.MQTT_PROVISION_POLL_MS = '0';
  process.env.MQTT_OUTBOX_POLL_MS = '0';

  const broker = await Aedes.createBroker();
  const server = net.createServer(broker.handle);
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  );
  const brokerPort = (server.address() as AddressInfo).port;

  const admin = new Pool({ connectionString: originalUrl });
  const schema = `mqtt_test_${randomBytes(8).toString('hex')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  const prisma = createPrismaClient();
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  let base = '';
  let device: MqttClient | undefined;
  let socket: WebSocket | undefined;
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
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { code: 'tenant-a' },
    });
    await prisma.mqttPlatformBroker.create({
      data: {
        id: 1,
        name: 'Local Mosquitto',
        host: '127.0.0.1',
        port: brokerPort,
        useTls: false,
        defaultProtocol: '3.1.1',
        adminUsername: 'admin',
        adminPassword: encryptSecrets({ password: 'admin-secret' }),
        bridgeUsername: 'bridge',
        bridgePassword: encryptSecrets({ password: 'bridge-secret' }),
        responseTopic: '$CONTROL/dynamic-security/v1/response',
        commandTimeoutMs: 2000,
        isEnabled: true,
      },
    });
    await prisma.tenantMqttCredential.create({
      data: {
        tenantId: tenant.id,
        platformBrokerId: 1,
        username: 'tenant_a',
        password: encryptSecrets({ password: 'tenant-secret' }),
        roleName: 'tenant_a_role',
        status: 'provisioned',
        provisionedAt: new Date(),
      },
    });

    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    app.useWebSocketAdapter(new WsAdapter(app));
    app.use(cookieParser());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    const wsUrl = `${base.replace(/^http/, 'ws')}/api/ws`;
    const tenantAdmin = await login('tenant-a', 'admin');
    const platform = await login('platform', 'platform-admin');

    await t.test(
      'tenant broker CRUD, bridge and credential reveal',
      async () => {
        assert.equal(
          (
            await call('/api/tenant/mqtt/brokers', tenantAdmin, 'POST', {
              name: 'local',
              host: '127.0.0.1',
              port: brokerPort,
              useTls: false,
              protocolVersion: '3.1.1',
              subscribeFilter: '#',
            })
          ).status,
          201,
        );
        const brokers = (await (
          await call('/api/tenant/mqtt/brokers', tenantAdmin)
        ).json()) as { data: { id: string }[] };
        assert.equal(brokers.data.length, 1);
        assert.equal(
          (
            await call(
              `/api/tenant/mqtt/brokers/${brokers.data[0].id}/test`,
              tenantAdmin,
              'POST',
            )
          ).status,
          201,
        );

        device = connect(`mqtt://127.0.0.1:${brokerPort}`, {
          protocolVersion: 4,
          clientId: 'device-test',
          reconnectPeriod: 0,
        });
        await new Promise<void>((resolveConnect, reject) => {
          device?.once('connect', () => resolveConnect());
          device?.once('error', reject);
        });
        await new Promise<void>((resolveSubscribe, reject) =>
          device?.subscribe('test/#', { qos: 1 }, (error) =>
            error ? reject(error) : resolveSubscribe(),
          ),
        );

        socket = await openSocket(wsUrl, tenantAdmin);
        const welcome = await nextFrame(socket);
        assert.equal(welcome.type, 'welcome');
        socket.send(
          JSON.stringify({
            type: 'mqtt.connect',
            brokerType: 'tenant',
            brokerId: brokers.data[0].id,
            protocolVersion: '3.1.1',
          }),
        );
        assert.equal((await nextFrame(socket)).type, 'mqtt.connected');
        socket.send(
          JSON.stringify({
            type: 'mqtt.subscribe',
            topic: 'test/in/#',
            qos: 1,
          }),
        );
        assert.equal((await nextFrame(socket)).type, 'mqtt.subscribed');

        const deviceMessage = new Promise<Frame>((resolveMessage, reject) => {
          const timer = setTimeout(
            () => reject(new Error('device did not receive message')),
            3000,
          );
          device?.once('message', (topic, payload) => {
            clearTimeout(timer);
            resolveMessage({ topic, payload: payload.toString() });
          });
        });
        socket.send(
          JSON.stringify({
            type: 'mqtt.publish',
            topic: 'test/out/command',
            payload: 'browser->device',
            qos: 1,
            retain: false,
          }),
        );
        const published = await nextFrame(socket);
        assert.equal(published.type, 'mqtt.published');
        assert.equal(published.sent, true);
        const deviceReceived = await deviceMessage;
        assert.equal(deviceReceived.topic, 'test/out/command');
        assert.equal(deviceReceived.payload, 'browser->device');

        device.publish('test/in/telemetry', 'device->bridge', { qos: 1 });
        const inbound = await nextFrame(socket);
        assert.equal(inbound.type, 'mqtt.message');
        assert.equal(inbound.topic, 'test/in/telemetry');
        assert.equal(inbound.payload, 'device->bridge');

        device.publish('test/in/duplicate', 'same-payload', { qos: 0 });
        device.publish('test/in/duplicate', 'same-payload', { qos: 0 });
        assert.equal(
          await waitFor(async () => {
            const count = await prisma.mqttMessage.count({
              where: {
                tenantId: tenant.id,
                direction: 'inbound',
                topic: 'test/in/duplicate',
              },
            });
            return count === 2;
          }),
          true,
        );
        assert.equal(
          await waitFor(async () => {
            const count = await prisma.mqttMessage.count({
              where: { tenantId: tenant.id },
            });
            return count >= 4;
          }),
          true,
        );
        assert.equal(
          await prisma.mqttMessage.count({
            where: { tenantId: tenant.id, direction: 'inbound' },
          }),
          3,
        );
        assert.equal(
          await prisma.mqttMessage.count({
            where: { tenantId: tenant.id, direction: 'outbound' },
          }),
          1,
        );

        const messages = (await (
          await call(
            `/api/platform/mqtt/messages?tenantId=${tenant.id}`,
            platform,
          )
        ).json()) as { total: number };
        assert.equal(messages.total, 4);
        assert.equal(
          (await call('/api/platform/mqtt/messages', tenantAdmin)).status,
          403,
        );

        assert.equal(
          (
            await call(
              '/api/tenant/mqtt/credentials/reveal',
              tenantAdmin,
              'POST',
              { password: 'wrong-password' },
            )
          ).status,
          403,
        );
        const revealed = (await (
          await call(
            '/api/tenant/mqtt/credentials/reveal',
            tenantAdmin,
            'POST',
            {
              password,
            },
          )
        ).json()) as { data: { username: string; password: string } };
        assert.equal(revealed.data.username, 'tenant_a');
        assert.equal(revealed.data.password, 'tenant-secret');

        const cleanupResponse = await call(
          `/api/platform/mqtt/messages?tenantId=${tenant.id}`,
          platform,
          'DELETE',
        );
        const cleanupText = await cleanupResponse.text();
        const cleanup = JSON.parse(cleanupText) as {
          data?: { deleted: number };
        };
        assert.equal(
          cleanupResponse.status,
          200,
          `cleanup failed: ${cleanupText}`,
        );
        assert.equal(cleanup.data?.deleted, 4);
        assert.equal(
          await prisma.mqttMessage.count({ where: { tenantId: tenant.id } }),
          0,
        );
        const events = await prisma.operationLog.findMany({
          where: { eventCode: 'realtime.mqtt', result: 'succeeded' },
        });
        assert(
          events.some((event) =>
            JSON.stringify(event.changes).includes('mqtt.publish'),
          ),
        );
        for (const event of events) {
          const detail = JSON.stringify(event.changes);
          assert(!detail.includes('browser->device'));
          assert(!detail.includes('tenant-secret'));
          assert(!detail.includes('bridge-secret'));
          assert(!detail.includes('admin-secret'));
        }
      },
    );
  } finally {
    socket?.close();
    await device?.endAsync(true).catch(() => undefined);
    await app?.close();
    await prisma.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = originalSecret;
    if (originalProvisionPoll === undefined)
      delete process.env.MQTT_PROVISION_POLL_MS;
    else process.env.MQTT_PROVISION_POLL_MS = originalProvisionPoll;
    if (originalOutboxPoll === undefined)
      delete process.env.MQTT_OUTBOX_POLL_MS;
    else process.env.MQTT_OUTBOX_POLL_MS = originalOutboxPoll;
    await new Promise<void>((resolveClose) =>
      server.close(() => resolveClose()),
    );
    await broker.close();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
