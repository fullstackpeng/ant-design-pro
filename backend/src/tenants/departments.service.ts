import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import { id, success, tenantId } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { departmentSubtree } from './department-tree.js';
import type {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department-request.dto.js';
@Injectable()
export class DepartmentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(session: SessionContext) {
    return success(
      await this.prisma.tenantDepartment.findMany({
        where: { tenantId: tenantId(session) },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
          isActive: true,
          parentId: true,
        },
      }),
    );
  }

  async create(session: SessionContext, body: CreateDepartmentDto) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      await this.validate(tx, tenant, body);
      await tx.tenantDepartment.create({
        data: {
          tenantId: tenant,
          ...body,
          parentId: body.parentId ? id(body.parentId) : null,
        },
      });
    });
    return success(null);
  }

  async update(
    session: SessionContext,
    entityId: string,
    body: UpdateDepartmentDto,
  ) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_id: { tenantId: tenant, id: id(entityId) } };
      await tx.tenantDepartment.findUniqueOrThrow({ where });
      await this.validate(tx, tenant, body, id(entityId));
      await tx.tenantDepartment.update({
        where,
        data: { ...body, parentId: body.parentId ? id(body.parentId) : null },
      });
    });
    return success(null);
  }

  private async validate(
    tx: Prisma.TransactionClient,
    tenant: bigint,
    body: CreateDepartmentDto,
    entityId?: bigint,
  ) {
    if (
      await tx.tenantDepartment.findFirst({
        where: {
          tenantId: tenant,
          code: body.code,
          ...(entityId ? { id: { not: entityId } } : {}),
        },
      })
    )
      throw new ConflictException({
        success: false,
        errorMessage: '部门编码已存在',
      });
    if (body.parentId) {
      await tx.tenantDepartment.findUniqueOrThrow({
        where: { tenantId_id: { tenantId: tenant, id: id(body.parentId) } },
      });
      if (entityId) {
        const rows = await tx.tenantDepartment.findMany({
          where: { tenantId: tenant },
          select: { id: true, parentId: true },
        });
        if (departmentSubtree(rows, entityId).includes(id(body.parentId)))
          throw new ConflictException({
            success: false,
            errorMessage: '上级部门不能是自身或下级部门',
          });
      }
    }
  }

  async remove(session: SessionContext, entityId: string) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_id: { tenantId: tenant, id: id(entityId) } };
      await tx.tenantDepartment.findUniqueOrThrow({ where });
      if (
        (await tx.tenantDepartment.count({
          where: { tenantId: tenant, parentId: id(entityId) },
        })) ||
        (await tx.tenantMembership.count({
          where: { tenantId: tenant, departmentId: id(entityId) },
        }))
      )
        throw new ConflictException({
          success: false,
          errorMessage: '请先移除子部门并解除成员关联',
        });
      await tx.tenantDepartment.delete({ where });
    });
    return success(null);
  }
}
