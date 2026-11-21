import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { DelayedError } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import { taskError } from './task.persistence.js';
import {
  DISPATCH_QUEUE,
  EXECUTION_QUEUE,
  SCHEDULER_PREFIX,
  type TaskSnapshot,
} from './task.types.js';
import { TaskDispatchService } from './task-dispatch.service.js';
import { TaskExecutionService } from './task-execution.service.js';

@Injectable()
export class TaskRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(TaskRuntimeService.name);
  private dispatchQueue?: ReturnType<QueueService['createQueue']>;
  private executionQueue?: ReturnType<QueueService['createQueue']>;
  private timer?: ReturnType<typeof setInterval>;
  private reconciling?: Promise<void>;
  private stopping = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QueueService) private readonly queues: QueueService,
    @Inject(TaskDispatchService)
    private readonly dispatches: TaskDispatchService,
    @Inject(TaskExecutionService)
    private readonly executions: TaskExecutionService,
  ) {}

  async start(onFatal: (error: Error) => void) {
    if (this.dispatchQueue) throw new Error('任务 Worker 已启动');
    await this.prisma.scheduledTask.count();
    this.dispatchQueue = this.queues.createQueue(DISPATCH_QUEUE);
    this.executionQueue = this.queues.createQueue(EXECUTION_QUEUE);
    await Promise.all([
      this.dispatchQueue.waitUntilReady(),
      this.executionQueue.waitUntilReady(),
    ]);
    const dispatcher = this.queues.createWorker<{
      taskId: string;
      revision: number;
    }>(DISPATCH_QUEUE, async (job) => {
      if (job.name !== 'dispatch' || !job.id) throw new Error('未知调度消息');
      await this.dispatches.dispatch(
        BigInt(job.data.taskId),
        `scheduled-${job.id}`,
        'scheduled',
        job.data.revision,
      );
      await this.enqueuePending();
    });
    const executor = this.queues.createWorker<{ runId: string }>(
      EXECUTION_QUEUE,
      async (job, token) => {
        if (job.name !== 'execute') throw new Error('未知执行消息');
        const result = await this.executions.execute(job.data.runId);
        if (result === 'busy') {
          await job.moveToDelayed(Date.now() + 1000, token);
          throw new DelayedError();
        }
      },
    );
    await Promise.all([dispatcher.waitUntilReady(), executor.waitUntilReady()]);
    void dispatcher.run().catch(onFatal);
    void executor.run().catch(onFatal);
    await this.reconcile();
    this.timer = setInterval(() => {
      void this.reconcile().catch((error) =>
        this.logger.error(taskError(error)),
      );
    }, 5000);
    this.timer.unref();
  }

  reconcile(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    this.reconciling ??= this.synchronize().finally(() => {
      this.reconciling = undefined;
    });
    return this.reconciling;
  }

  private async synchronize() {
    if (!this.dispatchQueue) throw new Error('任务 Worker 尚未启动');
    const schedulers = await this.dispatchQueue.getJobSchedulers(0, -1);
    let cursor: bigint | undefined;
    for (;;) {
      const tasks = await this.prisma.scheduledTask.findMany({
        orderBy: { id: 'asc' },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const task of tasks) {
        const token = randomUUID();
        const claimed = await this.prisma.scheduledTask.updateMany({
          where: {
            id: task.id,
            revision: task.revision,
            OR: [{ syncUntil: null }, { syncUntil: { lt: new Date() } }],
          },
          data: {
            syncToken: token,
            syncUntil: new Date(Date.now() + 30000),
            updatedAt: task.updatedAt,
          },
        });
        if (!claimed.count) continue;
        const prefix = `${SCHEDULER_PREFIX}${task.id}-v`;
        const schedulerId = `${prefix}${task.revision}`;
        try {
          if (task.enabled && !task.deletedAt)
            await this.dispatchQueue.upsertJobScheduler(
              schedulerId,
              { pattern: task.cron, tz: task.timezone },
              {
                name: 'dispatch',
                data: { taskId: String(task.id), revision: task.revision },
              },
            );
          for (const scheduler of schedulers)
            if (
              scheduler.key.startsWith(prefix) &&
              (scheduler.key !== schedulerId || !task.enabled || task.deletedAt)
            )
              await this.dispatchQueue.removeJobScheduler(scheduler.key);
          await this.prisma.scheduledTask.updateMany({
            where: { id: task.id, revision: task.revision, syncToken: token },
            data: {
              syncedRevision: task.revision,
              syncError: '',
              syncToken: null,
              syncUntil: null,
              updatedAt: task.updatedAt,
            },
          });
        } catch (error) {
          await this.prisma.scheduledTask.updateMany({
            where: { id: task.id, syncToken: token },
            data: {
              syncError: taskError(error),
              syncToken: null,
              syncUntil: null,
              updatedAt: task.updatedAt,
            },
          });
        } finally {
          await this.prisma.scheduledTask.updateMany({
            where: { id: task.id, syncToken: token },
            data: {
              syncToken: null,
              syncUntil: null,
              updatedAt: task.updatedAt,
            },
          });
        }
      }
      if (tasks.length < 100) break;
      cursor = tasks[tasks.length - 1].id;
    }
    await this.executions.recoverExpired();
    await this.enqueuePending();
  }

  async enqueuePending() {
    if (!this.executionQueue || this.stopping) return;
    let cursor: string | undefined;
    for (;;) {
      const runs = await this.prisma.taskRun.findMany({
        where: {
          status: { in: ['queued', 'retrying'] },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        take: 100,
        orderBy: { id: 'asc' },
      });
      for (const run of runs) {
        const id = `run-${run.id}`;
        const existing = await this.executionQueue.getJob(id);
        if (!existing) {
          const snapshot = run.snapshot as unknown as TaskSnapshot;
          await this.executionQueue.add(
            'execute',
            { runId: run.id },
            {
              jobId: id,
              attempts: snapshot.maxAttempts,
              backoff: { type: 'exponential', delay: 1000 },
            },
          );
        } else if (await existing.isFailed()) await existing.retry();
      }
      if (runs.length < 100 || this.stopping) break;
      cursor = runs[runs.length - 1].id;
    }
  }

  async onModuleDestroy() {
    this.stopping = true;
    clearInterval(this.timer);
    await this.reconciling;
  }
}
