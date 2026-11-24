import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { writeAudit } from '../audit/audit-action.js';
import { json } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma, TaskRun } from '../generated/prisma/client.js';
import { InternalExecutor } from './executors/internal.executor.js';
import { taskError } from './task.persistence.js';
import { type TaskSnapshot, terminalStatuses } from './task.types.js';

@Injectable()
export class TaskExecutionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InternalExecutor) private readonly executor: InternalExecutor,
  ) {}

  private async recordOutcome(
    tx: Prisma.TransactionClient,
    run: TaskRun,
    status: string,
  ) {
    const tenant =
      run.tenantId === null
        ? null
        : await tx.tenant.findUnique({
            where: { id: run.tenantId },
            select: { id: true, code: true, name: true },
          });
    await writeAudit(
      tx,
      { event: 'tasks.execution.finished', name: '定时任务执行结束' },
      {
        requestId: run.id,
        ip: '',
        userAgent: '',
        ...(tenant
          ? {
              tenantContext: {
                id: tenant.id.toString(),
                code: tenant.code,
                name: tenant.name,
              },
            }
          : {}),
        action: {
          changes: [
            {
              entity: 'taskRun',
              operation: status,
              before: {},
              after: {
                id: run.id,
                name: run.taskName,
                taskId: run.taskId.toString(),
                tenantId: run.tenantId?.toString() ?? null,
                status,
              },
            },
          ],
        },
      },
      status === 'succeeded'
        ? 'succeeded'
        : status === 'skipped'
          ? 'denied'
          : 'failed',
      status === 'succeeded' ? '' : '执行未成功，详见关联任务记录',
      run.id,
    );
  }

  private async claim(id: string) {
    return transaction(this.prisma, async (tx) => {
      const run = await tx.taskRun.findUniqueOrThrow({ where: { id } });
      const task = await tx.scheduledTask.findUniqueOrThrow({
        where: { id: run.taskId },
      });
      await tx.scheduledTask.update({
        where: { id: task.id },
        data: { executionFence: { increment: 1 }, updatedAt: task.updatedAt },
      });
      if (terminalStatuses.includes(run.status))
        return { kind: 'done' as const };
      const now = new Date();
      if (run.status === 'running') return { kind: 'busy' as const };
      if (
        !task.enabled ||
        task.deletedAt ||
        (run.tenantId !== null &&
          !(await tx.tenant.findFirst({
            where: { id: run.tenantId, isActive: true },
            select: { id: true },
          })))
      ) {
        await tx.taskRun.update({
          where: { id },
          data: {
            status: 'skipped',
            finishedAt: now,
            error: '任务禁用、删除或租户不可用',
          },
        });
        await this.recordOutcome(tx, run, 'skipped');
        return { kind: 'done' as const };
      }
      const snapshot = run.snapshot as unknown as TaskSnapshot;
      if (run.attemptsMade >= snapshot.maxAttempts) {
        await tx.taskRun.update({
          where: { id },
          data: {
            status: 'failed',
            finishedAt: now,
            error: '执行次数已达上限',
          },
        });
        await this.recordOutcome(tx, run, 'failed');
        return { kind: 'done' as const };
      }
      const active = await tx.taskRun.count({
        where: { taskId: task.id, status: 'running' },
      });
      const sameTenant = await tx.taskRun.count({
        where: { taskId: task.id, targetKey: run.targetKey, status: 'running' },
      });
      if (active >= task.concurrency || sameTenant)
        return { kind: 'busy' as const };
      const token = randomUUID();
      const number = run.attemptsMade + 1;
      await tx.taskRun.update({
        where: { id },
        data: {
          status: 'running',
          attemptsMade: number,
          leaseToken: token,
          leaseUntil: new Date(Date.now() + 30000),
          startedAt: run.startedAt ?? now,
          error: '',
        },
      });
      await tx.taskAttempt.create({
        data: {
          id: token,
          runId: id,
          number,
          status: 'running',
          startedAt: now,
        },
      });
      return {
        kind: 'claimed' as const,
        run,
        snapshot,
        token,
        number,
        started: now,
      };
    });
  }

  async execute(id: string) {
    const claim = await this.claim(id);
    if (claim.kind !== 'claimed') return claim.kind;
    const { run, snapshot, token, number, started } = claim;
    const controller = new AbortController();
    let timedOut = false;
    let leaseLost = false;
    let heartbeat: Promise<void> = Promise.resolve();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error('任务执行超时'));
    }, snapshot.timeoutMs);
    const renewal = setInterval(() => {
      heartbeat = heartbeat
        .then(async () => {
          const updated = await this.prisma.taskRun.updateMany({
            where: { id, status: 'running', leaseToken: token },
            data: { leaseUntil: new Date(Date.now() + 30000) },
          });
          if (!updated.count) throw new Error('执行租约失效');
        })
        .catch(() => {
          leaseLost = true;
          controller.abort(new Error('执行租约失效'));
        });
    }, 5000);
    let result: Record<string, unknown> | undefined;
    let failure: unknown;
    try {
      result = await this.executor.execute(snapshot, {
        runId: id,
        tenantId: run.tenantId,
        idempotencyKey: run.idempotencyKey,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
    } catch (error) {
      failure = error;
    } finally {
      clearTimeout(timeout);
      clearInterval(renewal);
      await heartbeat;
    }
    if (leaseLost) throw new Error('执行租约已失效，结果等待恢复核查');
    const retry =
      failure !== undefined &&
      number < snapshot.maxAttempts &&
      !(failure instanceof UnrecoverableError);
    const status =
      failure === undefined
        ? 'succeeded'
        : retry
          ? 'retrying'
          : timedOut
            ? 'timed_out'
            : 'failed';
    const error =
      failure === undefined
        ? ''
        : timedOut
          ? '任务执行超时'
          : taskError(failure);
    const ended = new Date();
    const committed = await transaction(this.prisma, async (tx) => {
      const updated = await tx.taskRun.updateMany({
        where: { id, leaseToken: token, status: 'running' },
        data: {
          status,
          leaseToken: null,
          leaseUntil: null,
          error,
          finishedAt: retry ? null : ended,
          durationMs: ended.getTime() - (run.startedAt ?? started).getTime(),
          ...(result ? { result: json(result) as Prisma.InputJsonObject } : {}),
        },
      });
      if (updated.count)
        await tx.taskAttempt.update({
          where: { id: token },
          data: {
            status:
              failure === undefined
                ? 'succeeded'
                : timedOut
                  ? 'timed_out'
                  : 'failed',
            finishedAt: ended,
            durationMs: ended.getTime() - started.getTime(),
            error,
          },
        });
      if (updated.count && !retry) await this.recordOutcome(tx, run, status);
      return updated.count;
    });
    if (!committed) throw new Error('执行结果未提交：租约已被其他实例接管');
    if (retry) throw new Error(error);
    return 'done' as const;
  }

  async recoverExpired() {
    const rows = await this.prisma.taskRun.findMany({
      where: { status: 'running', leaseUntil: { lt: new Date() } },
      take: 100,
    });
    for (const run of rows)
      await transaction(this.prisma, async (tx) => {
        const snapshot = run.snapshot as unknown as TaskSnapshot;
        const now = new Date();
        const retry = run.attemptsMade < snapshot.maxAttempts;
        const changed = await tx.taskRun.updateMany({
          where: {
            id: run.id,
            status: 'running',
            leaseToken: run.leaseToken,
            leaseUntil: { lt: now },
          },
          data: {
            status: retry ? 'retrying' : 'failed',
            leaseToken: null,
            leaseUntil: null,
            finishedAt: retry ? null : now,
            durationMs: run.startedAt
              ? now.getTime() - run.startedAt.getTime()
              : null,
            error: '执行进程中断或租约过期，副作用需通过业务幂等核查',
          },
        });
        if (changed.count && !retry)
          await this.recordOutcome(tx, run, 'failed');
        if (changed.count && run.leaseToken) {
          const attempt = await tx.taskAttempt.findUnique({
            where: { id: run.leaseToken },
          });
          if (attempt)
            await tx.taskAttempt.updateMany({
              where: { id: run.leaseToken, status: 'running' },
              data: {
                status: 'interrupted',
                finishedAt: now,
                durationMs: now.getTime() - attempt.startedAt.getTime(),
                error: '执行进程中断或租约过期',
              },
            });
        }
      });
  }
}
