import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import type { SessionContext } from '../auth/session-context.js';
import { invalid, json, pagination, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CreateTaskDto,
  RevisionDto,
  RunQueryDto,
  TaskConfigDto,
  TaskEnabledDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/task-request.dto.js';
import { InternalExecutor } from './executors/internal.executor.js';
import { runSelect, taskSelect } from './task.persistence.js';
import { TaskDispatchService } from './task-dispatch.service.js';

@Injectable()
export class ScheduledTasksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InternalExecutor) private readonly internal: InternalExecutor,
    @Inject(TaskDispatchService)
    private readonly dispatches: TaskDispatchService,
  ) {}

  handlers() {
    return success(this.internal.catalog());
  }

  async list(query: TaskQueryDto) {
    const where = {
      deletedAt: null,
      ...(query.name
        ? { name: { contains: query.name, mode: 'insensitive' as const } }
        : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.scheduledTask.findMany({
        where,
        select: taskSelect,
        ...pagination(query),
        orderBy: { id: 'desc' },
      }),
      this.prisma.scheduledTask.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async validate(body: TaskConfigDto) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: body.timezone }).format();
      if (![5, 6].includes(body.cron.split(/\s+/).length))
        throw new Error('fields');
      CronExpressionParser.parse(body.cron, { tz: body.timezone }).next();
    } catch {
      invalid('Cron 表达式或时区无效（支持5或6字段）');
    }
    if (Buffer.byteLength(JSON.stringify(body.params)) > 4096)
      invalid('任务参数不能超过4KB');
    this.internal.validate(body.handler, body.scope, body.params);
    if ((body.scope === 'selected') !== body.tenantIds.length > 0)
      invalid('指定租户必须选择目标，其他作用范围不能指定租户');
  }

  private async validateTenants(
    tx: Prisma.TransactionClient,
    body: TaskConfigDto,
  ) {
    if (
      body.tenantIds.length &&
      (await tx.tenant.count({
        where: { id: { in: body.tenantIds.map(BigInt) } },
      })) !== body.tenantIds.length
    )
      invalid('包含不存在的租户');
  }

  async create(actor: SessionContext, body: CreateTaskDto) {
    await this.validate(body);
    return transaction(this.prisma, async (tx) => {
      await this.validateTenants(tx, body);
      const task = await tx.scheduledTask.create({
        data: { ...body, params: json(body.params) as Prisma.InputJsonObject },
        select: taskSelect,
      });
      await tx.taskAudit.create({
        data: {
          taskId: task.id,
          actorId: BigInt(actor.userid),
          actorName: actor.name,
          action: 'create',
          before: {},
          after: json(task),
        },
      });
      return success(task);
    });
  }

  async update(actor: SessionContext, id: bigint, body: UpdateTaskDto) {
    await this.validate(body);
    const { revision, ...config } = body;
    return transaction(this.prisma, async (tx) => {
      await this.validateTenants(tx, body);
      const before = await tx.scheduledTask.findFirstOrThrow({
        where: { id, deletedAt: null },
        select: taskSelect,
      });
      this.revision(before.revision, revision);
      const after = await tx.scheduledTask.update({
        where: { id, revision },
        data: {
          ...config,
          params: json(config.params) as Prisma.InputJsonObject,
          revision: { increment: 1 },
          syncError: '',
          syncToken: null,
          syncUntil: null,
        },
        select: taskSelect,
      });
      if (!config.enabled) await this.cancelPending(tx, id);
      await tx.taskAudit.create({
        data: {
          taskId: id,
          actorId: BigInt(actor.userid),
          actorName: actor.name,
          action: 'update',
          before: json(before),
          after: json(after),
        },
      });
      return success(after);
    });
  }

  enable(actor: SessionContext, id: bigint, body: TaskEnabledDto) {
    return this.changeState(actor, id, body, false);
  }
  remove(actor: SessionContext, id: bigint, body: RevisionDto) {
    return this.changeState(actor, id, body, true);
  }

  private async changeState(
    actor: SessionContext,
    id: bigint,
    body: RevisionDto & { enabled?: boolean },
    remove: boolean,
  ) {
    await transaction(this.prisma, async (tx) => {
      const before = await tx.scheduledTask.findFirstOrThrow({
        where: { id, deletedAt: null },
        select: taskSelect,
      });
      this.revision(before.revision, body.revision);
      const after = await tx.scheduledTask.update({
        where: { id, revision: body.revision },
        data: {
          enabled: remove ? false : body.enabled,
          deletedAt: remove ? new Date() : null,
          revision: { increment: 1 },
          syncError: '',
          syncToken: null,
          syncUntil: null,
        },
        select: taskSelect,
      });
      if (!after.enabled) await this.cancelPending(tx, id);
      await tx.taskAudit.create({
        data: {
          taskId: id,
          actorId: BigInt(actor.userid),
          actorName: actor.name,
          action: remove ? 'delete' : body.enabled ? 'enable' : 'disable',
          before: json(before),
          after: json(after),
        },
      });
    });
    return success(null);
  }

  private revision(actual: number, expected: number) {
    if (actual !== expected)
      throw new ConflictException({
        success: false,
        errorMessage: '任务已变更，请刷新后操作',
      });
  }

  private cancelPending(tx: Prisma.TransactionClient, taskId: bigint) {
    return tx.taskRun.updateMany({
      where: { taskId, status: { in: ['queued', 'retrying'] } },
      data: {
        status: 'skipped',
        finishedAt: new Date(),
        error: '任务被禁用或删除',
      },
    });
  }

  async trigger(actor: SessionContext, id: bigint, body: RevisionDto) {
    return success(
      await this.dispatches.dispatch(
        id,
        `manual-${randomUUID()}`,
        'manual',
        body.revision,
        actor,
      ),
    );
  }

  async rerun(actor: SessionContext, id: string) {
    const previous = await this.prisma.taskRun.findUniqueOrThrow({
      where: { id },
      include: { task: true },
    });
    return success(
      await this.dispatches.dispatch(
        previous.taskId,
        `rerun-${randomUUID()}`,
        'rerun',
        previous.task.revision,
        actor,
        id,
      ),
    );
  }

  async runs(query: RunQueryDto) {
    const where = {
      ...(query.taskId ? { taskId: BigInt(query.taskId) } : {}),
      ...(query.name
        ? { taskName: { contains: query.name, mode: 'insensitive' as const } }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.taskRun.findMany({
        where,
        select: runSelect,
        ...pagination(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taskRun.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async run(id: string) {
    return success(
      await this.prisma.taskRun.findUniqueOrThrow({
        where: { id },
        select: runSelect,
      }),
    );
  }
}
