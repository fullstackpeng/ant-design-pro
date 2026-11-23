import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import {
  id,
  json,
  pagination,
  success,
  tenantId,
} from '../common/validation.js';
import { prepareAccount, resolveAccount } from '../database/accounts.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ensureMemberCapacity } from '../plans/entitlements.js';
import { departmentSubtree } from './department-tree.js';
import type {
  CreateMemberDto,
  MemberQueryDto,
  UpdateMemberDto,
} from './dto/member-request.dto.js';

@Injectable()
export class MembersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(session: SessionContext, query: MemberQueryDto) {
    const tenant = tenantId(session);
    const where: Prisma.TenantMembershipWhereInput = { tenantId: tenant };
    if (query.departmentId === 'unassigned') where.departmentId = null;
    else if (query.departmentId) {
      const root = id(query.departmentId);
      await this.prisma.tenantDepartment.findUniqueOrThrow({
        where: { tenantId_id: { tenantId: tenant, id: root } },
      });
      const departments = await this.prisma.tenantDepartment.findMany({
        where: { tenantId: tenant },
        select: { id: true, parentId: true },
      });
      where.departmentId = { in: departmentSubtree(departments, root) };
    }
    if (query.positionId === 'unassigned') where.positions = { none: {} };
    else if (query.positionId)
      where.positions = { some: { positionId: id(query.positionId) } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tenantMembership.findMany({
        where,
        ...pagination(query),
        orderBy: { userId: 'asc' },
        select: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
              parentId: true,
              sortOrder: true,
              isActive: true,
            },
          },
          positions: {
            select: {
              position: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  sortOrder: true,
                  isActive: true,
                },
              },
            },
            orderBy: { positionId: 'asc' },
          },
          roles: {
            select: {
              role: { select: { id: true, name: true, permissions: true } },
            },
          },
          userId: true,
          role: true,
          isActive: true,
          user: { select: { username: true, name: true } },
        },
      }),
      this.prisma.tenantMembership.count({ where }),
    ]);
    return {
      success: true as const,
      data: json(
        rows.map((row) => ({
          ...row,
          roles: row.roles.map((r) => r.role),
          positions: row.positions.map((p) => p.position),
        })),
      ),
      total,
    };
  }

  async add(session: SessionContext, body: CreateMemberDto) {
    const tenant = tenantId(session);
    const memberRole = body.role;
    if (
      session.access !== 'admin' &&
      (memberRole === 'admin' || body.roleIds !== undefined)
    )
      throw new ForbiddenException({
        success: false,
        errorMessage: '仅租户管理员可以分配角色',
      });
    const account = await prepareAccount(body);
    await transaction(this.prisma, async (tx) => {
      await ensureMemberCapacity(tx, tenant);
      const user = await resolveAccount(tx, account);
      await tx.tenantMembership.create({
        data: { tenantId: tenant, userId: user.id, role: memberRole },
      });
      await this.assignRoles(tx, tenant, user.id, body.roleIds);
      await this.assignOrganization(tx, tenant, user.id, body);
    });
    return success(null);
  }

  update(session: SessionContext, user: string, body: UpdateMemberDto) {
    return this.change(session, user, body);
  }

  remove(session: SessionContext, user: string) {
    return this.change(session, user, null);
  }

  private async change(
    session: SessionContext,
    user: string,
    body: UpdateMemberDto | null,
  ) {
    const tenant = tenantId(session);
    const userId = id(user);
    const nextRole = body?.role ?? 'user';
    const isActive = body?.isActive ?? false;
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_userId: { tenantId: tenant, userId } };
      const current = await tx.tenantMembership.findUniqueOrThrow({ where });
      if (
        session.access !== 'admin' &&
        (current.role === 'admin' ||
          nextRole === 'admin' ||
          body?.roleIds !== undefined)
      )
        throw new ForbiddenException({
          success: false,
          errorMessage: '仅租户管理员可以管理管理员或分配角色',
        });
      if (
        current.role === 'admin' &&
        current.isActive &&
        (!isActive || nextRole !== 'admin')
      ) {
        const admins = await tx.tenantMembership.count({
          where: {
            tenantId: tenant,
            role: 'admin',
            isActive: true,
            user: { isActive: true },
          },
        });
        if (admins <= 1)
          throw new ConflictException({
            success: false,
            errorMessage: '必须保留至少一名启用的租户管理员',
          });
      }
      if (!current.isActive && isActive) await ensureMemberCapacity(tx, tenant);
      if (!body) await tx.tenantMembership.delete({ where });
      else {
        await tx.tenantMembership.update({
          where,
          data: { role: nextRole, isActive },
        });
        await this.assignRoles(tx, tenant, userId, body.roleIds);
        await this.assignOrganization(tx, tenant, userId, body);
        if (!isActive)
          await tx.session.deleteMany({ where: { tenantId: tenant, userId } });
      }
    });
    return success(null);
  }

  private async assignRoles(
    tx: Prisma.TransactionClient,
    tenant: bigint,
    userId: bigint,
    roleIds?: string[],
  ) {
    if (roleIds === undefined) return;
    const ids = roleIds.map(id);
    if (
      (await tx.tenantRole.count({
        where: { tenantId: tenant, id: { in: ids } },
      })) !== ids.length
    )
      throw new ForbiddenException({
        success: false,
        errorMessage: '角色不存在或不属于当前租户',
      });
    await tx.memberRole.deleteMany({ where: { tenantId: tenant, userId } });
    await tx.memberRole.createMany({
      data: ids.map((roleId) => ({ tenantId: tenant, userId, roleId })),
    });
  }

  async organizationOptions(session: SessionContext) {
    const tenant = tenantId(session);
    const [departments, positions] = await this.prisma.$transaction([
      this.prisma.tenantDepartment.findMany({
        where: { tenantId: tenant },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          parentId: true,
          sortOrder: true,
          isActive: true,
        },
      }),
      this.prisma.tenantPosition.findMany({
        where: { tenantId: tenant },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          sortOrder: true,
          isActive: true,
        },
      }),
    ]);
    return success({ departments, positions });
  }

  private async assignOrganization(
    tx: Prisma.TransactionClient,
    tenant: bigint,
    userId: bigint,
    body: CreateMemberDto | UpdateMemberDto,
  ) {
    const member = { tenantId: tenant, userId };
    if (body.departmentId !== undefined) {
      const current = await tx.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: member },
      });
      const departmentId =
        body.departmentId === null ? null : id(body.departmentId);
      if (departmentId !== null) {
        const department = await tx.tenantDepartment.findUnique({
          where: { tenantId_id: { tenantId: tenant, id: departmentId } },
        });
        if (
          !department ||
          (!department.isActive && current.departmentId !== departmentId)
        )
          throw new ForbiddenException({
            success: false,
            errorMessage: '部门不存在、不属于当前租户或已停用',
          });
      }
      await tx.tenantMembership.update({
        where: { tenantId_userId: member },
        data: { departmentId },
      });
    }
    if (body.positionIds !== undefined) {
      const ids = body.positionIds.map(id);
      const positions = await tx.tenantPosition.findMany({
        where: { tenantId: tenant, id: { in: ids } },
      });
      const current = await tx.memberPosition.findMany({
        where: member,
        select: { positionId: true },
      });
      const retained = new Set(current.map((row) => row.positionId));
      if (
        positions.length !== ids.length ||
        positions.some((row) => !row.isActive && !retained.has(row.id))
      )
        throw new ForbiddenException({
          success: false,
          errorMessage: '岗位不存在、不属于当前租户或已停用',
        });
      await tx.memberPosition.deleteMany({ where: member });
      await tx.memberPosition.createMany({
        data: ids.map((positionId) => ({ ...member, positionId })),
      });
    }
  }

  async subscription(session: SessionContext) {
    const tenant = tenantId(session);
    const [subscription, used] = await this.prisma.$transaction([
      this.prisma.subscription.findUnique({
        where: { tenantId: tenant },
        include: { plan: true },
      }),
      this.prisma.tenantMembership.count({
        where: { tenantId: tenant, isActive: true },
      }),
    ]);
    return success({ subscription, used });
  }
}
