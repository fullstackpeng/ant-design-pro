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
import { migrateQueue } from '../queue/queue.migration.js';
import { QueueService } from '../queue/queue.service.js';
import { WorkerModule } from '../queue/worker.module.js';
import type { CreateTaskDto } from './dto/task-request.dto.js';
import { InternalExecutor } from './executors/internal.executor.js';
import {
  DISPATCH_QUEUE,
  EXECUTION_QUEUE,
  terminalStatuses,
} from './task.types.js';
import { TaskDispatchService } from './task-dispatch.service.js';
import { TaskExecutionService } from './task-execution.service.js';
import { TaskRuntimeService } from './task-runtime.service.js';

test('platform scheduled tasks: authorization, isolation, execution and recovery', {
  timeout: 120000,
}, async (t) => {
  const suffix = randomBytes(8).toString('hex');
  const schema = `task_test_${suffix}`;
  const queueSchema = `task_queue_${suffix}`;
  const keys = [
    'DATABASE_URL',
    'QUEUE_DATABASE_URL',
    'QUEUE_SCHEMA',
    'QUEUE_POOL_SIZE',
    'QUEUE_WORKER_CONCURRENCY',
  ] as const;
  const previous = keys.map((key) => [key, process.env[key]] as const);
  const originalUrl = process.env.DATABASE_URL;
  const admin = new Pool({ connectionString: originalUrl });
  const url = new URL(originalUrl ?? '');
  url.searchParams.set('schema', schema);
  process.env.DATABASE_URL = url.toString();
  process.env.QUEUE_DATABASE_URL = originalUrl;
  process.env.QUEUE_SCHEMA = queueSchema;
  process.env.QUEUE_POOL_SIZE = '2';
  process.env.QUEUE_WORKER_CONCURRENCY = '2';
  const prisma = createPrismaClient();
  let api: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  const workers: Array<
    Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
  > = [];
  const fatal: Error[] = [];
  const password = 'task-test-password';
  let base = '';
  let platform = '';
  let tenant = '';
  const root = '/api/platform/scheduled-tasks';
  t.after(async () => {
    try {
      await Promise.all(workers.map((worker) => worker.close()));
      await api?.close();
      await prisma.$disconnect();
      assert.match(schema, /^task_test_[a-f0-9]{16}$/);
      assert.match(queueSchema, /^task_queue_[a-f0-9]{16}$/);
      await admin.query(`DROP SCHEMA IF EXISTS "${queueSchema}" CASCADE`);
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end();
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  async function call(
    path: string,
    method = 'GET',
    body?: unknown,
    cookie = platform,
  ) {
    return fetch(`${base}${path}`, {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function login(tenantCode: string, username: string) {
    const result = await call(
      '/api/login/account',
      'POST',
      { tenantCode, username, password },
      '',
    );
    assert.equal(result.status, 200);
    return (result.headers.get('set-cookie') ?? '').split(';')[0];
  }
  const defaults: CreateTaskDto = {
    name: '系统检查',
    type: 'internal',
    handler: 'system.ping',
    cron: '0 0 1 1 *',
    timezone: 'Asia/Taipei',
    scope: 'global',
    tenantIds: [],
    params: {},
    enabled: true,
    timeoutMs: 1000,
    maxAttempts: 2,
    concurrency: 2,
  };
  async function create(overrides: Partial<CreateTaskDto> = {}) {
    const body = { ...defaults, ...overrides };
    const result = await call(root, 'POST', body);
    assert.equal(result.status, 201, await result.clone().text());
    return {
      body,
      task: (await result.json()).data as { id: string; revision: number },
    };
  }
  async function trigger(task: { id: string; revision: number }) {
    const result = await call(`${root}/${task.id}/trigger`, 'POST', {
      revision: task.revision,
    });
    assert.equal(result.status, 201, await result.clone().text());
    return (await result.json()).data as string;
  }
  async function waitRuns(dispatchId: string) {
    for (let count = 0; count < 200; count++) {
      const rows = await prisma.taskRun.findMany({
        where: { dispatchId },
        include: { attempts: { orderBy: { number: 'asc' } } },
      });
      if (
        rows.length &&
        rows.every((run) => terminalStatuses.includes(run.status))
      )
        return rows;
      await setTimeout(100);
    }
    const remaining = await prisma.taskRun.findMany({
      where: { dispatchId, status: { notIn: terminalStatuses } },
      select: {
        id: true,
        status: true,
        attemptsMade: true,
        error: true,
        leaseUntil: true,
      },
    });
    const queue = workers[0]?.get(QueueService).createQueue(EXECUTION_QUEUE);
    console.error(
      'Incomplete task diagnostics',
      remaining.slice(0, 10),
      queue ? await queue.getJobCounts() : {},
    );
    if (queue)
      console.error(
        'Incomplete queue states',
        await Promise.all(
          remaining.slice(0, 10).map(async (run) => {
            const job = await queue.getJob(`run-${run.id}`);
            return {
              id: run.id,
              state: await job?.getState(),
              error: job?.failedReason,
            };
          }),
        ),
      );
    assert.fail(`execution did not finish: ${dispatchId}`);
  }
  async function startWorker() {
    const worker = await NestFactory.createApplicationContext(WorkerModule, {
      logger: false,
      abortOnError: false,
    });
    workers.push(worker);
    await worker.get(TaskRuntimeService).start((error) => {
      fatal.push(error);
    });
    return worker;
  }
  async function closeWorkers() {
    await Promise.all(workers.splice(0).map((worker) => worker.close()));
  }

  const client = await admin.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const migration of (
      await readdir(resolve('prisma/migrations'))
    ).sort()) {
      if (!migration.startsWith('.') && migration !== 'migration_lock.toml')
        await client.query(
          await readFile(
            resolve('prisma/migrations', migration, 'migration.sql'),
            'utf8',
          ),
        );
    }
  } finally {
    await client.query('RESET search_path');
    client.release();
  }
  await migrateQueue();
  await seedDemoData(prisma, password);
  api = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  api.useWebSocketAdapter(new WsAdapter(api));
  api.use(cookieParser());
  await api.listen(0, '127.0.0.1');
  base = await api.getUrl();
  platform = await login('platform', 'platform-admin');
  tenant = await login('tenant-a', 'admin');
  const tenantA = await prisma.tenant.findUniqueOrThrow({
    where: { code: 'tenant-a' },
  });
  const tenantB = await prisma.tenant.findUniqueOrThrow({
    where: { code: 'tenant-b' },
  });

  await t.test(
    'every task/log operation is platform-only and the menu is absent for tenants',
    async () => {
      const paths: Array<[string, string]> = [
        [root, 'GET'],
        [root, 'POST'],
        [`${root}/handlers`, 'GET'],
        [`${root}/runs`, 'GET'],
        [`${root}/runs/${randomUUID()}`, 'GET'],
        [`${root}/runs/${randomUUID()}/rerun`, 'POST'],
        [`${root}/1`, 'PATCH'],
        [`${root}/1`, 'DELETE'],
        [`${root}/1/enabled`, 'PATCH'],
        [`${root}/1/trigger`, 'POST'],
      ];
      for (const [path, method] of paths) {
        assert.equal(
          (await call(path, method, method === 'GET' ? undefined : {}, tenant))
            .status,
          403,
        );
        assert.equal(
          (await call(path, method, method === 'GET' ? undefined : {}, ''))
            .status,
          401,
        );
      }
      const platformNav = (await (await call('/api/current/navigation')).json())
        .data;
      const tenantNav = (
        await (
          await call('/api/current/navigation', 'GET', undefined, tenant)
        ).json()
      ).data;
      assert(platformNav.allowedPaths.includes('/platform/scheduled-tasks'));
      assert(!tenantNav.allowedPaths.includes('/platform/scheduled-tasks'));
      const handlers = (await (await call(`${root}/handlers`)).json()).data;
      assert.equal(handlers.length, 2);
    },
  );

  await t.test(
    'DTOs, cron, handler allowlist, target scope and optimistic revisions are enforced',
    async () => {
      for (const change of [
        { cron: 'not cron' },
        { timezone: 'bad/zone' },
        { handler: 'constructor' },
        { type: 'script' },
        { timeoutMs: '1000' },
        { maxAttempts: 0 },
        { enabled: 'true' },
        { scope: 'selected', tenantIds: [] },
        { tenantIds: [String(tenantA.id)] },
        { scope: 'selected', tenantIds: ['999999999'] },
        { params: { command: 'anything' } },
        { handler: 'tenant.dictionary-summary' },
      ])
        assert.equal(
          (await call(root, 'POST', { ...defaults, ...change })).status,
          400,
        );
      assert.equal((await call(`${root}?pageSize=101`)).status, 400);
      const { task, body } = await create();
      const changed = await call(`${root}/${task.id}`, 'PATCH', {
        ...body,
        name: '已更新',
        revision: task.revision,
      });
      assert.equal(changed.status, 200);
      assert.equal(
        (
          await call(`${root}/${task.id}`, 'PATCH', {
            ...body,
            revision: task.revision,
          })
        ).status,
        409,
      );
      assert.equal(
        await prisma.taskAudit.count({ where: { taskId: BigInt(task.id) } }),
        2,
      );
    },
  );

  await t.test(
    'manual runs are persisted offline and retain their snapshot after editing',
    async () => {
      const { task, body } = await create({ params: { message: 'before' } });
      const dispatchId = await trigger(task);
      assert.equal(
        (await prisma.taskRun.findFirstOrThrow({ where: { dispatchId } }))
          .status,
        'queued',
      );
      assert.equal(
        (
          await call(`${root}/${task.id}`, 'PATCH', {
            ...body,
            params: { message: 'after' },
            revision: task.revision,
          })
        ).status,
        200,
      );
      await startWorker();
      await startWorker();
      const [run] = await waitRuns(dispatchId);
      assert.equal(run.status, 'succeeded');
      assert.equal((run.result as { message: string }).message, 'before');
      assert.equal(run.attempts.length, 1);
      const auditEvents = await prisma.operationLog.findMany({
        where: { eventCode: 'tasks.execution.finished', requestId: run.id },
      });
      assert.equal(auditEvents.length, 1);
      assert.equal(auditEvents[0].result, 'succeeded');
      assert.equal((await call(`${root}/runs/${run.id}`)).status, 200);
      const filtered = await (
        await call(
          `${root}/runs?name=${encodeURIComponent(defaults.name)}&type=internal&status=succeeded&taskId=${task.id}&pageSize=1`,
        )
      ).json();
      assert.equal(filtered.total, 1);
      assert.equal(filtered.data.length, 1);
    },
  );

  await t.test(
    'tenant fan-out is isolated and disabled tenants are excluded or skipped',
    async () => {
      await prisma.dictionaryType.create({
        data: { tenantId: tenantA.id, code: 'a-only', name: 'A' },
      });
      await prisma.dictionaryType.createMany({
        data: [
          { tenantId: tenantB.id, code: 'b-one', name: 'B1' },
          { tenantId: tenantB.id, code: 'b-two', name: 'B2' },
        ],
      });
      const inactive = await prisma.tenant.create({
        data: { code: 'inactive', name: 'Inactive', isActive: false },
      });
      const { task } = await create({
        handler: 'tenant.dictionary-summary',
        scope: 'all',
      });
      const id = await trigger(task);
      await workers[0].get(TaskRuntimeService).reconcile();
      const runs = await waitRuns(id);
      assert.equal(runs.length, 2);
      assert(runs.every((run) => run.status === 'succeeded'));
      for (const run of runs) {
        const result = run.result as { tenantId: string; types: number };
        assert.equal(result.tenantId, String(run.tenantId));
        assert.equal(result.types, run.tenantId === tenantA.id ? 1 : 2);
      }
      const selected = await create({
        scope: 'selected',
        tenantIds: [String(inactive.id)],
      });
      const selectedId = await trigger(selected.task);
      await workers[0].get(TaskRuntimeService).reconcile();
      assert.equal((await waitRuns(selectedId))[0].status, 'skipped');
    },
  );

  await t.test(
    'timeouts retry with attempt logs; reruns preserve lineage and idempotency',
    async () => {
      const { task, body } = await create({
        timeoutMs: 100,
        params: { delayMs: 300 },
      });
      const dispatchId = await trigger(task);
      await workers[0].get(TaskRuntimeService).reconcile();
      const [failed] = await waitRuns(dispatchId);
      assert.equal(failed.status, 'timed_out');
      assert.equal(failed.attemptsMade, 2);
      assert.deepEqual(
        failed.attempts.map((attempt) => attempt.status),
        ['timed_out', 'timed_out'],
      );
      assert.equal(
        (
          await call(`${root}/${task.id}`, 'PATCH', {
            ...body,
            params: {},
            revision: task.revision,
          })
        ).status,
        200,
      );
      const response = await call(`${root}/runs/${failed.id}/rerun`, 'POST');
      assert.equal(response.status, 201);
      await workers[0].get(TaskRuntimeService).reconcile();
      const [rerun] = await waitRuns((await response.json()).data);
      assert.equal(rerun.status, 'succeeded');
      assert.equal(rerun.retryOf, failed.id);
      assert.equal(rerun.idempotencyKey, failed.idempotencyKey);
      assert.equal(
        (await call(`${root}/runs/${rerun.id}/rerun`, 'POST')).status,
        409,
      );
    },
  );

  await t.test(
    'ordinary failures retry and feature revocation prevents tenant execution',
    async () => {
      let attempts = 0;
      const restores = workers.map((worker) => {
        const executor = worker.get(InternalExecutor);
        const original = executor.execute.bind(executor);
        executor.execute = async (snapshot, context) => {
          if (snapshot.params.message === 'transient' && attempts++ === 0)
            throw new Error('transient failure');
          return original(snapshot, context);
        };
        return () => {
          executor.execute = original;
        };
      });
      try {
        const { task } = await create({ params: { message: 'transient' } });
        const id = await trigger(task);
        await workers[0].get(TaskRuntimeService).reconcile();
        const [run] = await waitRuns(id);
        assert.equal(run.status, 'succeeded');
        assert.deepEqual(
          run.attempts.map((attempt) => attempt.status),
          ['failed', 'succeeded'],
        );
      } finally {
        restores.forEach((restore) => {
          restore();
        });
      }
      const { task } = await create({
        handler: 'tenant.dictionary-summary',
        scope: 'selected',
        tenantIds: [String(tenantB.id)],
      });
      await prisma.tenantFeature.delete({
        where: {
          tenantId_featureCode: {
            tenantId: tenantB.id,
            featureCode: 'dictionaries',
          },
        },
      });
      const id = await trigger(task);
      await workers[0].get(TaskRuntimeService).reconcile();
      const [run] = await waitRuns(id);
      assert.equal(run.status, 'failed');
      assert.equal(run.attemptsMade, 1);
    },
  );

  await t.test(
    'duplicate dispatch and competing execution are fenced by database state',
    async () => {
      const { task } = await create({ params: { delayMs: 150 } });
      const key = `test-${randomUUID()}`;
      await Promise.all(
        workers.map((worker) =>
          worker
            .get(TaskDispatchService)
            .dispatch(BigInt(task.id), key, 'scheduled', task.revision),
        ),
      );
      const rows = await prisma.taskRun.findMany({
        where: { dispatchId: key },
      });
      assert.equal(rows.length, 1);
      const results = await Promise.all(
        workers.map((worker) =>
          worker.get(TaskExecutionService).execute(rows[0].id),
        ),
      );
      assert(results.includes('done'));
      assert.equal(
        await prisma.taskAttempt.count({ where: { runId: rows[0].id } }),
        1,
      );
    },
  );

  await t.test('same-task target runs serialize across workers', async () => {
    const { task } = await create({ params: { delayMs: 200 } });
    const first = await trigger(task);
    const second = await trigger(task);
    await workers[0].get(TaskRuntimeService).reconcile();
    const periods = (await Promise.all([waitRuns(first), waitRuns(second)]))
      .flat()
      .map((run) => {
        assert(run.startedAt);
        assert(run.finishedAt);
        return {
          start: run.startedAt.getTime(),
          end: run.finishedAt.getTime(),
        };
      })
      .sort((a, b) => a.start - b.start);
    assert(periods[0].end <= periods[1].start);
  });

  await t.test(
    'disable/delete skip queued runs, reject stale triggers and retain history',
    async () => {
      await closeWorkers();
      const { task } = await create();
      const dispatchId = await trigger(task);
      assert.equal(
        (
          await call(`${root}/${task.id}/enabled`, 'PATCH', {
            revision: task.revision,
            enabled: false,
          })
        ).status,
        200,
      );
      assert.equal((await waitRuns(dispatchId))[0].status, 'skipped');
      assert.equal(
        (await call(`${root}/${task.id}/trigger`, 'POST', { revision: 2 }))
          .status,
        409,
      );
      assert(api);
      assert.equal(
        await api
          .get(TaskDispatchService)
          .dispatch(BigInt(task.id), `stale-${randomUUID()}`, 'scheduled', 1),
        null,
      );
      assert.equal(
        (await call(`${root}/${task.id}`, 'DELETE', { revision: 2 })).status,
        200,
      );
      assert.equal(
        await prisma.taskRun.count({ where: { taskId: BigInt(task.id) } }),
        1,
      );
      assert.equal(
        (
          await (
            await call(`${root}?name=${encodeURIComponent('系统检查')}`)
          ).json()
        ).data.some((row: { id: string }) => row.id === task.id),
        false,
      );
      await startWorker();
    },
  );

  await t.test(
    'expired execution leases recover with an interrupted attempt record',
    async () => {
      const { task } = await create();
      const dispatchId = await trigger(task);
      const run = await prisma.taskRun.findFirstOrThrow({
        where: { dispatchId },
      });
      const token = randomUUID();
      await prisma.taskRun.update({
        where: { id: run.id },
        data: {
          status: 'running',
          attemptsMade: 1,
          leaseToken: token,
          leaseUntil: new Date(0),
          startedAt: new Date(),
        },
      });
      await prisma.taskAttempt.create({
        data: {
          id: token,
          runId: run.id,
          number: 1,
          status: 'running',
          startedAt: new Date(),
        },
      });
      await workers[0].get(TaskRuntimeService).reconcile();
      const [recovered] = await waitRuns(dispatchId);
      assert.equal(recovered.status, 'succeeded');
      assert.deepEqual(
        recovered.attempts.map((attempt) => attempt.status),
        ['interrupted', 'succeeded'],
      );
    },
  );

  await t.test(
    'worker restart restores pending runs and missing schedulers',
    async () => {
      await closeWorkers();
      const { task } = await create();
      const id = await trigger(task);
      const worker = await startWorker();
      assert.equal((await waitRuns(id))[0].status, 'succeeded');
      const queue = worker.get(QueueService).createQueue(DISPATCH_QUEUE);
      const schedulerId = `platform-task-${task.id}-v1`;
      assert.equal(await queue.removeJobScheduler(schedulerId), true);
      await worker.get(TaskRuntimeService).reconcile();
      assert(
        (await queue.getJobSchedulers(0, -1)).some(
          (item) => item.key === schedulerId,
        ),
      );
    },
  );

  await t.test(
    'cron updates take effect dynamically and obsolete schedulers are removed',
    async () => {
      const { task, body } = await create({
        cron: '* * * * * *',
        name: 'Cron检查',
      });
      const worker = workers[0];
      await worker.get(TaskRuntimeService).reconcile();
      for (let count = 0; count < 60; count++) {
        if (
          await prisma.taskRun.count({
            where: { taskId: BigInt(task.id), status: 'succeeded' },
          })
        )
          break;
        await setTimeout(100);
      }
      assert(
        (await prisma.taskRun.count({
          where: {
            taskId: BigInt(task.id),
            source: 'scheduled',
            status: 'succeeded',
          },
        })) > 0,
      );
      assert.equal(
        (
          await call(`${root}/${task.id}`, 'PATCH', {
            ...body,
            cron: '0 0 1 1 *',
            revision: 1,
          })
        ).status,
        200,
      );
      await worker.get(TaskRuntimeService).reconcile();
      const queue = worker.get(QueueService).createQueue(DISPATCH_QUEUE);
      const schedulers = (await queue.getJobSchedulers(0, -1)).filter((item) =>
        item.key.startsWith(`platform-task-${task.id}-v`),
      );
      assert.equal(schedulers.length, 1);
      assert.equal(schedulers[0].key, `platform-task-${task.id}-v2`);
      assert.equal(schedulers[0].pattern, '0 0 1 1 *');
      assert.equal(
        (
          await prisma.scheduledTask.findUniqueOrThrow({
            where: { id: BigInt(task.id) },
          })
        ).syncedRevision,
        2,
      );
    },
  );
  await t.test(
    'scheduler synchronization failures are visible and recover after a valid update',
    async () => {
      const { task, body } = await create();
      await prisma.scheduledTask.update({
        where: { id: BigInt(task.id) },
        data: { cron: 'invalid cron' },
      });
      await workers[0].get(TaskRuntimeService).reconcile();
      const failed = await prisma.scheduledTask.findUniqueOrThrow({
        where: { id: BigInt(task.id) },
      });
      assert(failed.syncError.length > 0);
      assert(failed.syncedRevision < failed.revision);
      assert.equal(
        (
          await call(`${root}/${task.id}`, 'PATCH', {
            ...body,
            revision: task.revision,
          })
        ).status,
        200,
      );
      await workers[0].get(TaskRuntimeService).reconcile();
      const recovered = await prisma.scheduledTask.findUniqueOrThrow({
        where: { id: BigInt(task.id) },
      });
      assert.equal(recovered.syncError, '');
      assert.equal(recovered.syncedRevision, recovered.revision);
    },
  );

  await t.test(
    'reconciliation enqueues every tenant beyond the first 100 pending records',
    async () => {
      await prisma.tenant.createMany({
        data: Array.from({ length: 101 }, (_, index) => ({
          code: `bulk-${index}`,
          name: `Bulk ${index}`,
        })),
      });
      const queue = workers[0].get(QueueService).createQueue(EXECUTION_QUEUE);
      await queue.pause();
      let dispatchId: string;
      try {
        const { task } = await create({ scope: 'all', concurrency: 10 });
        dispatchId = await trigger(task);
        await workers[0].get(TaskRuntimeService).reconcile();
        const rows = await prisma.taskRun.findMany({ where: { dispatchId } });
        assert(rows.length > 100);
        const jobs = await Promise.all(
          rows.map((run) => queue.getJob(`run-${run.id}`)),
        );
        assert(jobs.every(Boolean));
      } finally {
        await queue.resume();
      }
      assert(
        (await waitRuns(dispatchId)).every((run) => run.status === 'succeeded'),
      );
    },
  );
  assert.deepEqual(fatal, []);
});
