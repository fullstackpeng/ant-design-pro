import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { queueConfig } from './queue.config.js';
import { migrateQueue } from './queue.migration.js';
import { QueueModule } from './queue.module.js';
import { QueueService } from './queue.service.js';
import { QueueProbeWorker } from './queue-probe.worker.js';
import { WorkerModule } from './worker.module.js';

test('queue configuration isolates the PostgreSQL backend', () => {
  const config = queueConfig({
    DATABASE_URL:
      'postgresql://localhost/app?schema=tenant_data&sslmode=disable',
  });
  const url = new URL(config.connection.connectionString);
  assert.equal(url.searchParams.has('schema'), false);
  assert.equal(url.searchParams.get('sslmode'), 'disable');
  assert.equal(config.connection.schema, 'bullmq');
  assert.equal(config.connection.migrate, false);
  assert.equal(config.connection.max, 5);
  assert.equal(config.concurrency, 2);
  assert.equal(
    new URL(
      queueConfig({
        DATABASE_URL: 'postgresql://localhost/business',
        QUEUE_DATABASE_URL: 'postgresql://localhost/queues',
      }).connection.connectionString,
    ).pathname,
    '/queues',
  );
  assert.throws(() => queueConfig({}), /required/);
  assert.throws(
    () =>
      queueConfig({
        DATABASE_URL: 'postgresql://localhost/business?schema=business',
        QUEUE_DATABASE_URL: 'postgresql://localhost/business',
        QUEUE_SCHEMA: 'business',
      }),
    /separate/,
  );
  assert.throws(
    () =>
      queueConfig({
        DATABASE_URL: 'postgresql://localhost/business',
        QUEUE_SCHEMA: 'information_schema',
      }),
    /separate/,
  );
  for (const value of ['redis://localhost', 'not a URL'])
    assert.throws(() => queueConfig({ DATABASE_URL: value }), /PostgreSQL/);
  for (const schema of [
    'public',
    'tenant_data',
    'pg_catalog',
    'bad;drop',
    'a'.repeat(64),
  ])
    assert.throws(() =>
      queueConfig({
        DATABASE_URL: 'postgresql://localhost/app?schema=tenant_data',
        QUEUE_SCHEMA: schema,
      }),
    );
  for (const value of ['0', '-1', '1.5', 'NaN', '', '101'])
    assert.throws(
      () =>
        queueConfig({
          DATABASE_URL: 'postgresql://localhost/app',
          QUEUE_WORKER_CONCURRENCY: value,
        }),
      /QUEUE_WORKER_CONCURRENCY/,
    );
  assert.throws(
    () =>
      queueConfig({
        DATABASE_URL: 'postgresql://localhost/app',
        QUEUE_POOL_SIZE: '51',
      }),
    /QUEUE_POOL_SIZE/,
  );
});

test('PostgreSQL queues: migrations, recovery, retries, workers and schedulers', {
  timeout: 90000,
}, async (t) => {
  const schema = `queue_test_${randomBytes(8).toString('hex')}`;
  const keys = [
    'QUEUE_DATABASE_URL',
    'QUEUE_SCHEMA',
    'QUEUE_POOL_SIZE',
    'QUEUE_WORKER_CONCURRENCY',
  ] as const;
  const previous = keys.map((key) => [key, process.env[key]] as const);
  process.env.QUEUE_DATABASE_URL = process.env.DATABASE_URL;
  process.env.QUEUE_SCHEMA = schema;
  process.env.QUEUE_POOL_SIZE = '2';
  process.env.QUEUE_WORKER_CONCURRENCY = '1';
  const config = queueConfig();
  const admin = new Pool({
    connectionString: config.connection.connectionString,
  });
  const apps: Array<
    Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
  > = [];
  t.after(async () => {
    try {
      await Promise.all(apps.map((app) => app.close()));
      // Only this test's generated namespace is removed, never public/bullmq.
      assert.match(schema, /^queue_test_[a-f0-9]{16}$/);
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end();
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  async function context(worker = false) {
    const app = await NestFactory.createApplicationContext(
      worker ? WorkerModule : QueueModule,
      { logger: false, abortOnError: false },
    );
    apps.push(app);
    return { app, queues: app.get(QueueService) };
  }
  async function close(app: (typeof apps)[number]) {
    await app.close();
    apps.splice(apps.indexOf(app), 1);
  }

  await t.test(
    'API-only module boot stays offline; migration is explicit and repeatable',
    async () => {
      const { app } = await context();
      assert.equal(
        (await admin.query('SELECT to_regnamespace($1) AS schema', [schema]))
          .rows[0].schema,
        null,
      );
      await close(app);
      const versions = await Promise.all([
        migrateQueue(config),
        migrateQueue(config),
      ]);
      assert.equal(versions[0], versions[1]);
      assert(versions[0] > 0);
      assert.equal(await migrateQueue(config), versions[0]);
      const ledger = await admin.query(
        `SELECT count(*)::int AS count, count(DISTINCT version)::int AS versions FROM "${schema}".migration`,
      );
      assert.equal(ledger.rows[0].count, ledger.rows[0].versions);
    },
  );

  await t.test(
    'a missing migration fails the standalone worker and releases its connections',
    async () => {
      await assert.rejects(
        promisify(execFile)(process.execPath, [resolve('dist/worker.js')], {
          env: { ...process.env, QUEUE_SCHEMA: `${schema}_missing` },
          timeout: 15000,
        }),
        (error: unknown) => {
          assert(error instanceof Error);
          assert.match(error.message, /not initialized/);
          assert(!('killed' in error) || !error.killed);
          return true;
        },
      );
    },
  );

  await t.test(
    'delayed jobs persist across producer shutdown and retry before completing',
    async () => {
      const producer = await context();
      const queue = producer.queues.createQueue<{ tenantId: string }, string>(
        'recovery',
      );
      const job = await queue.add(
        'tenant-job',
        { tenantId: 'tenant-a' },
        {
          delay: 100,
          attempts: 2,
          backoff: { type: 'fixed', delay: 50 },
        },
      );
      assert(job.id);
      const id = job.id;
      await close(producer.app);
      const consumer = await context();
      const recoveredQueue = consumer.queues.createQueue<
        { tenantId: string },
        string
      >('recovery');
      const events = consumer.queues.createEvents<string>('recovery');
      await events.waitUntilReady();
      const recovered = await recoveredQueue.getJob(id);
      assert(recovered);
      const attempts: number[] = [];
      const worker = consumer.queues.createWorker<{ tenantId: string }, string>(
        'recovery',
        async (current) => {
          assert.equal(current.data.tenantId, 'tenant-a');
          attempts.push(current.attemptsMade);
          if (current.attemptsMade === 0)
            throw new Error('transient test failure');
          return current.data.tenantId;
        },
      );
      await worker.waitUntilReady();
      const running = worker.run();
      assert.equal(
        await recovered.waitUntilFinished(events, 15000),
        'tenant-a',
      );
      assert.deepEqual(attempts, [0, 1]);
      assert.equal(await recovered.getState(), 'completed');
      await close(consumer.app);
      await running;
    },
  );

  await t.test(
    'result waits distinguish terminal failures, missing jobs and wait timeouts',
    async () => {
      const { app, queues } = await context();
      const queue = queues.createQueue<Record<string, never>>('results');
      const pending = await queue.add('pending', {});
      assert(pending.id);
      await assert.rejects(
        queues.waitForResult(queue, pending.id, 50),
        /execution may continue/,
      );
      assert.equal(await pending.getState(), 'waiting');
      await assert.rejects(
        queues.waitForResult(queue, 'missing', 100),
        /no longer exists/,
      );
      await pending.remove();
      const worker = queues.createWorker('results', async () => {
        throw new Error('permanent test failure');
      });
      await worker.waitUntilReady();
      const running = worker.run();
      const failed = await queue.add('fail', {}, { attempts: 1 });
      assert(failed.id);
      await assert.rejects(
        queues.waitForResult(queue, failed.id),
        /permanent test failure/,
      );
      assert.equal(await failed.getState(), 'failed');
      await close(app);
      await running;
    },
  );

  await t.test(
    'two independent workers share a queue without duplicate claims',
    async () => {
      const first = await context();
      const second = await context();
      const queue = first.queues.createQueue<{ number: number }, number>(
        'competing',
      );
      const events = first.queues.createEvents<number>('competing');
      await events.waitUntilReady();
      const seen: number[] = [];
      let active = 0;
      let peak = 0;
      await queue.setGlobalConcurrency(2);
      const workers = [first, second].map(({ queues }) =>
        queues.createWorker<{ number: number }, number>(
          'competing',
          async (job) => {
            active++;
            peak = Math.max(active, peak);
            seen.push(job.data.number);
            await new Promise((resolve) => setTimeout(resolve, 25));
            active--;
            return job.data.number;
          },
          { concurrency: 2 },
        ),
      );
      await Promise.all(workers.map((worker) => worker.waitUntilReady()));
      const running = workers.map((worker) => worker.run());
      const jobs = await queue.addBulk(
        Array.from({ length: 8 }, (_, number) => ({
          name: 'work',
          data: { number },
        })),
      );
      const results = await Promise.all(
        jobs.map((job) => {
          assert(job.id);
          return first.queues.waitForResult(queue, job.id);
        }),
      );
      assert.deepEqual(
        results,
        Array.from({ length: 8 }, (_, number) => number),
      );
      assert.equal(seen.length, 8);
      assert.equal(new Set(seen).size, 8);
      assert(peak <= 2);
      await close(second.app);
      await close(first.app);
      await Promise.all(running);
    },
  );

  await t.test(
    'a stable scheduler can be updated, restored and removed',
    async () => {
      const first = await context();
      const queue = first.queues.createQueue<{ version: number }>('schedulers');
      await queue.upsertJobScheduler(
        'platform-task-1',
        { pattern: '* * * * * *', tz: 'Asia/Taipei' },
        {
          name: 'scheduled',
          data: { version: 1 },
        },
      );
      await queue.upsertJobScheduler(
        'platform-task-1',
        { pattern: '*/2 * * * * *', tz: 'Asia/Taipei' },
        {
          name: 'scheduled',
          data: { version: 2 },
        },
      );
      assert.equal((await queue.getJobSchedulers()).length, 1);
      await close(first.app);
      const second = await context();
      const restored = second.queues.createQueue<{ version: number }>(
        'schedulers',
      );
      const schedulers = await restored.getJobSchedulers();
      assert.equal(schedulers.length, 1);
      assert.equal(schedulers[0].pattern, '*/2 * * * * *');
      const events = second.queues.createEvents('schedulers');
      await events.waitUntilReady();
      let notify!: () => void;
      const executed = new Promise<void>((resolve) => {
        notify = resolve;
      });
      const worker = second.queues.createWorker<{ version: number }>(
        'schedulers',
        async (job) => {
          assert.equal(job.data.version, 2);
          notify();
        },
      );
      await worker.waitUntilReady();
      const running = worker.run();
      await executed;
      assert.equal(await restored.removeJobScheduler('platform-task-1'), true);
      assert.equal((await restored.getJobSchedulers()).length, 0);
      await close(second.app);
      await running;
    },
  );

  await t.test(
    'Nest shutdown waits for active processing and prevents new resources',
    async () => {
      const { app, queues } = await context();
      const queue = queues.createQueue<Record<string, never>>('shutdown');
      let entered!: () => void;
      let release!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      const worker = queues.createWorker('shutdown', async () => {
        entered();
        await blocked;
      });
      await worker.waitUntilReady();
      const running = worker.run();
      await queue.add('wait', {});
      await started;
      let closed = false;
      const closing = close(app).then(() => {
        closed = true;
      });
      // Allow Nest to enter the asynchronous destruction hooks.
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(closed, false);
      assert.throws(() => queues.createQueue('late'), /shutting down/);
      release();
      await closing;
      await running;
    },
  );

  await t.test(
    'the standalone probe command is handled by the Nest WorkerModule',
    async () => {
      const { app } = await context(true);
      const worker = app.get(QueueProbeWorker).create();
      await worker.waitUntilReady();
      const running = worker.run();
      const result = await promisify(execFile)(
        process.execPath,
        [resolve('dist/queue/probe.js')],
        {
          env: process.env,
          timeout: 20000,
        },
      );
      assert.match(result.stdout, /BullMQ PostgreSQL probe completed:/);
      await close(app);
      await running;
    },
  );
});
