import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import type { SessionContext } from '../auth/session-context.js';
import { id, success, tenantId } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CreatePositionDto,
  UpdatePositionDto,
} from './dto/position-request.dto.js';

@Injectable()
export class PositionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(session: SessionContext) {
    return success(
      await this.prisma.tenantPosition.findMany({
        where: { tenantId: tenantId(session) },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
          isActive: true,
        },
      }),
    );
  }

  @AuditAction({
    event: 'positions.create',
    name: '新增岗位',
    entity: 'tenantPosition',
  })
  async create(session: SessionContext, body: CreatePositionDto) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      await this.validate(tx, tenant, body);
      await tx.tenantPosition.create({ data: { tenantId: tenant, ...body } });
    });
    return success(null);
  }

  @AuditAction({
    event: 'positions.update',
    name: '修改岗位',
    targetArg: 1,
    entity: 'tenantPosition',
  })
  async update(
    session: SessionContext,
    entityId: string,
    body: UpdatePositionDto,
  ) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_id: { tenantId: tenant, id: id(entityId) } };
      await tx.tenantPosition.findUniqueOrThrow({ where });
      await this.validate(tx, tenant, body, id(entityId));
      await tx.tenantPosition.update({ where, data: { ...body } });
    });
    return success(null);
  }

  private async validate(
    tx: Prisma.TransactionClient,
    tenant: bigint,
    body: CreatePositionDto,
    entityId?: bigint,
  ) {
    if (
      await tx.tenantPosition.findFirst({
        where: {
          tenantId: tenant,
          code: body.code,
          ...(entityId ? { id: { not: entityId } } : {}),
        },
      })
    )
      throw new ConflictException({
        success: false,
        errorMessage: '岗位编码已存在',
      });
  }

  @AuditAction({
    event: 'positions.delete',
    name: '删除岗位',
    targetArg: 1,
    entity: 'tenantPosition',
  })
  async remove(session: SessionContext, entityId: string) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_id: { tenantId: tenant, id: id(entityId) } };
      await tx.tenantPosition.findUniqueOrThrow({ where });
      if (
        await tx.memberPosition.count({
          where: { tenantId: tenant, positionId: id(entityId) },
        })
      )
        throw new ConflictException({
          success: false,
          errorMessage: '请先解除成员与岗位的关联',
        });
      await tx.tenantPosition.delete({ where });
    });
    return success(null);
  }
}
