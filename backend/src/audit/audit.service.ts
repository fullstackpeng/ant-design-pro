import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import { id, json, pagination, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditAction } from './audit-action.js';
import { auditContext, auditSnapshot } from './audit-context.js';
import type {
  AuditQueryDto,
  UpdateAuditPolicyDto,
} from './dto/audit-request.dto.js';
import type { AuditLogDto } from './dto/audit-response.dto.js';

const listSelect = {
  id: true,
  eventId: true,
  eventCode: true,
  module: true,
  action: true,
  scope: true,
  tenantId: true,
  tenantCode: true,
  tenantName: true,
  actorId: true,
  actorName: true,
  targetTenantId: true,
  targetType: true,
  targetId: true,
  targetName: true,
  result: true,
  message: true,
  requestId: true,
  ip: true,
  userAgent: true,
  createdAt: true,
} as const;

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private where(
    session: SessionContext,
    query: Partial<AuditQueryDto>,
  ): Prisma.LoginLogWhereInput {
    if (
      query.startAt &&
      query.endAt &&
      new Date(query.startAt) > new Date(query.endAt)
    )
      throw new BadRequestException('开始时间不能晚于结束时间');
    if (
      session.tenant &&
      query.tenantId &&
      query.tenantId !== session.tenant.id
    )
      throw new ForbiddenException('不能访问其他租户');
    if (!session.tenant && !session.isPlatformAdmin)
      throw new ForbiddenException('无权查看日志');
    return {
      ...(session.tenant
        ? { scope: 'tenant', tenantId: id(session.tenant.id) }
        : query.tenantId
          ? {
              OR: [
                { tenantId: id(query.tenantId) },
                { targetTenantId: id(query.tenantId) },
              ],
            }
          : {}),
      ...(query.actorName
        ? { actorName: { contains: query.actorName, mode: 'insensitive' } }
        : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.eventCode ? { eventCode: { contains: query.eventCode } } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.ip ? { ip: query.ip } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.startAt || query.endAt
        ? {
            createdAt: {
              ...(query.startAt ? { gte: new Date(query.startAt) } : {}),
              ...(query.endAt ? { lte: new Date(query.endAt) } : {}),
            },
          }
        : {}),
    };
  }

  async list(
    session: SessionContext,
    query: AuditQueryDto,
    kind: 'operation' | 'login',
  ) {
    const where = this.where(session, query);
    if (kind === 'login') {
      if (query.attemptedAccount)
        where.attemptedAccount = {
          contains: query.attemptedAccount,
          mode: 'insensitive',
        };
      if (query.attemptedTenant)
        where.attemptedTenant = {
          contains: query.attemptedTenant,
          mode: 'insensitive',
        };
    }
    const [rows, total] =
      kind === 'login'
        ? await this.prisma.$transaction([
            this.prisma.loginLog.findMany({
              select: {
                ...listSelect,
                attemptedAccount: true,
                attemptedTenant: true,
              },
              where,
              ...pagination(query),
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            }),
            this.prisma.loginLog.count({ where }),
          ])
        : await this.prisma.$transaction([
            this.prisma.operationLog.findMany({
              select: listSelect,
              where: where as Prisma.OperationLogWhereInput,
              ...pagination(query),
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            }),
            this.prisma.operationLog.count({
              where: where as Prisma.OperationLogWhereInput,
            }),
          ]);
    return {
      success: true as const,
      data: json(
        rows.map((row) => ({ ...row, changes: [] })),
      ) as unknown as AuditLogDto[],
      total,
    };
  }

  async detail(
    session: SessionContext,
    value: string,
    kind: 'operation' | 'login',
  ) {
    const where = {
      ...this.where(session, {}),
      id: id(value),
    };
    const row =
      kind === 'login'
        ? await this.prisma.loginLog.findFirst({ where })
        : await this.prisma.operationLog.findFirst({
            where: where as Prisma.OperationLogWhereInput,
          });
    if (!row) throw new NotFoundException('日志不存在');
    return {
      success: true as const,
      data: json(row) as unknown as AuditLogDto,
    };
  }

  async policy() {
    const row = await this.prisma.auditPolicy.findUniqueOrThrow({
      where: { id: 1 },
    });
    return success({
      operationDays: row.operationDays,
      loginDays: row.loginDays,
      revision: row.revision,
    });
  }

  @AuditAction({
    event: 'audit.policy.update',
    name: '修改日志保留策略',
    entity: 'auditPolicy',
  })
  async updatePolicy(body: UpdateAuditPolicyDto) {
    await this.prisma
      .$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(11242026, 1)`;
    const before = await this.prisma.auditPolicy.findUniqueOrThrow({
      where: { id: 1 },
    });
    if (before.revision !== body.revision)
      throw new ConflictException('配置已被修改，请刷新后重试');
    const after = await this.prisma.auditPolicy.update({
      where: { id: 1, revision: body.revision },
      data: {
        operationDays: body.operationDays,
        loginDays: body.loginDays,
        revision: { increment: 1 },
      },
    });
    auditContext.getStore()?.action?.changes.push({
      entity: 'auditPolicy',
      operation: 'update',
      before: auditSnapshot(before),
      after: auditSnapshot(after),
    });
    return success({
      operationDays: after.operationDays,
      loginDays: after.loginDays,
      revision: after.revision,
    });
  }
}
