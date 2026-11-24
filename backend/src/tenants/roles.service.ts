import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import {
  availablePermissions,
  validatePermissions,
} from '../auth/permissions.js';
import type { SessionContext } from '../auth/session-context.js';
import { id, success, tenantId } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateRoleDto, UpdateRoleDto } from './dto/role-request.dto.js';

@Injectable()
export class RolesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(session: SessionContext) {
    return success(
      await this.prisma.tenantRole.findMany({
        where: { tenantId: tenantId(session) },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, permissions: true },
      }),
    );
  }

  async catalog(session: SessionContext) {
    const tenantFeatures = await this.prisma.tenantFeature.findMany({
      where: { tenantId: tenantId(session) },
      include: {
        feature: {
          select: {
            code: true,
            name: true,
            description: true,
            category: true,
            sortOrder: true,
            isDemo: true,
          },
        },
      },
    });
    const features = new Map(
      tenantFeatures.map((row) => [row.feature.code, row.feature]),
    );
    return success(
      availablePermissions([...features.keys()])
        .map((permission) => {
          const feature = features.get(permission.featureCode);
          if (!feature) return null;
          return {
            ...permission,
            featureName: feature.name,
            featureDescription: feature.description,
            category: feature.category,
            sortOrder: feature.sortOrder,
            isDemo: feature.isDemo,
          };
        })
        .filter((permission) => permission !== null)
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category) ||
            a.sortOrder - b.sortOrder ||
            a.featureCode.localeCompare(b.featureCode) ||
            a.code.localeCompare(b.code),
        ),
    );
  }

  @AuditAction({
    event: 'roles.create',
    name: '新增角色',
    entity: 'tenantRole',
  })
  async create(session: SessionContext, body: CreateRoleDto) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      await this.validate(tx, tenant, body);
      await tx.tenantRole.create({
        data: {
          tenantId: tenant,
          name: body.name,
          permissions: body.permissions,
        },
      });
    });
    return success(null);
  }

  @AuditAction({
    event: 'roles.update',
    name: '修改角色权限',
    targetArg: 1,
    entity: 'tenantRole',
  })
  async update(session: SessionContext, roleId: string, body: UpdateRoleDto) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_id: { tenantId: tenant, id: id(roleId) } };
      await tx.tenantRole.findUniqueOrThrow({ where });
      await this.validate(tx, tenant, body, id(roleId));
      await tx.tenantRole.update({
        where,
        data: { name: body.name, permissions: body.permissions },
      });
    });
    return success(null);
  }

  private async validate(
    tx: Prisma.TransactionClient,
    tenant: bigint,
    body: CreateRoleDto,
    roleId?: bigint,
  ) {
    const features = await tx.tenantFeature.findMany({
      where: { tenantId: tenant },
    });
    validatePermissions(
      body.permissions,
      features.map((feature) => feature.featureCode),
    );
    const duplicate = await tx.tenantRole.findFirst({
      where: {
        tenantId: tenant,
        name: body.name,
        ...(roleId ? { id: { not: roleId } } : {}),
      },
    });
    if (duplicate)
      throw new ConflictException({
        success: false,
        errorMessage: '角色名称已存在',
      });
  }

  @AuditAction({
    event: 'roles.delete',
    name: '删除角色',
    targetArg: 1,
    entity: 'tenantRole',
  })
  async remove(session: SessionContext, roleId: string) {
    await transaction(this.prisma, async (tx) => {
      const tenant = tenantId(session);
      await tx.tenantRole.findUniqueOrThrow({
        where: { tenantId_id: { tenantId: tenant, id: id(roleId) } },
      });
      if (
        await tx.memberRole.count({
          where: { tenantId: tenant, roleId: id(roleId) },
        })
      )
        throw new ConflictException({
          success: false,
          errorMessage: '请先解除成员与角色的关联',
        });
      await tx.tenantRole.delete({
        where: { tenantId_id: { tenantId: tenant, id: id(roleId) } },
      });
    });
    return success(null);
  }
}
