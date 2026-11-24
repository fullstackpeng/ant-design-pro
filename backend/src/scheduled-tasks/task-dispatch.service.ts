import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { writeAudit } from '../audit/audit-action.js';
import type { SessionContext } from '../auth/session-context.js';
import { json } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { taskSnapshot } from './task.persistence.js';

@Injectable()
export class TaskDispatchService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dispatch(
    taskId: bigint,
    key: string,
    source: 'scheduled' | 'manual' | 'rerun',
    expectedRevision: number,
    actor?: SessionContext,
    retryOf?: string,
  ) {
    return transaction(this.prisma, async (tx) => {
      const task = await tx.scheduledTask.findUniqueOrThrow({
        where: { id: taskId },
      });
      // Serialize fan-out with configuration edits and other dispatchers.
      await tx.scheduledTask.update({
        where: { id: taskId },
        data: { executionFence: { increment: 1 }, updatedAt: task.updatedAt },
      });
      const existing = await tx.taskDispatch.findUnique({ where: { id: key } });
      if (existing) return existing.id;
      if (
        !task.enabled ||
        task.deletedAt ||
        task.revision !== expectedRevision
      ) {
        if (source === 'scheduled') return null;
        throw new ConflictException({
          success: false,
          errorMessage: '任务已变更、禁用或删除，请刷新后操作',
        });
      }
      const snapshot = json(taskSnapshot(task)) as Prisma.InputJsonObject;
      const previous = retryOf
        ? await tx.taskRun.findUniqueOrThrow({ where: { id: retryOf } })
        : null;
      if (
        previous &&
        (previous.taskId !== taskId ||
          !['failed', 'timed_out'].includes(previous.status))
      )
        throw new ConflictException({
          success: false,
          errorMessage: '仅允许重新执行失败或超时记录',
        });
      if (
        previous &&
        (task.scope === 'global'
          ? previous.tenantId !== null
          : previous.tenantId === null ||
            (task.scope === 'selected' &&
              !task.tenantIds.includes(String(previous.tenantId))))
      )
        throw new ConflictException({
          success: false,
          errorMessage: '原执行目标不在当前任务作用范围内',
        });
      let targets: Array<bigint | null>;
      if (previous) targets = [previous.tenantId];
      else if (task.scope === 'global') targets = [null];
      else if (task.scope === 'selected') targets = task.tenantIds.map(BigInt);
      else
        targets = (
          await tx.tenant.findMany({
            where: { isActive: true },
            select: { id: true },
            orderBy: { id: 'asc' },
          })
        ).map((tenant) => tenant.id);
      await tx.taskDispatch.create({
        data: { id: key, taskId, source, snapshot },
      });
      if (targets.length)
        await tx.taskRun.createMany({
          data: targets.map((tenantId) => {
            const runId = randomUUID();
            return {
              id: runId,
              taskId,
              dispatchId: key,
              targetKey: tenantId === null ? 'global' : String(tenantId),
              tenantId,
              taskName: task.name,
              type: task.type,
              source,
              snapshot,
              idempotencyKey: previous?.idempotencyKey ?? runId,
              retryOf: previous?.id ?? null,
            };
          }),
        });
      if (actor)
        await tx.taskAudit.create({
          data: {
            taskId,
            actorId: BigInt(actor.userid),
            actorName: actor.name,
            action: source,
            before: {},
            after: {
              dispatchId: key,
              targets: targets.map(String),
              retryOf: retryOf ?? null,
            },
          },
        });
      if (source === 'scheduled')
        await writeAudit(
          tx,
          { event: 'tasks.dispatch.scheduled', name: '系统调度定时任务' },
          {
            requestId: key,
            ip: '',
            userAgent: '',
            action: {
              changes: [
                {
                  entity: 'scheduledTask',
                  operation: 'dispatch',
                  before: {},
                  after: {
                    id: taskId.toString(),
                    name: task.name,
                    dispatchId: key,
                    targets: targets.map(String),
                  },
                },
              ],
            },
          },
          'accepted',
          '已生成执行记录',
          taskId.toString(),
        );
      return key;
    });
  }
}
