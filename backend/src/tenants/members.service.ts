import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import type { PaginationQueryDto } from '../common/dto/request.dto.js';
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
import { ensureMemberCapacity } from '../plans/entitlements.js';
import type {
  CreateMemberDto,
  UpdateMemberDto,
} from './dto/member-request.dto.js';

@Injectable()
export class MembersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(session: SessionContext, query: PaginationQueryDto) {
    const where = { tenantId: tenantId(session) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tenantMembership.findMany({
        where,
        ...pagination(query),
        orderBy: { userId: 'asc' },
        select: {
          userId: true,
          role: true,
          isActive: true,
          user: { select: { username: true, name: true } },
        },
      }),
      this.prisma.tenantMembership.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async add(session: SessionContext, body: CreateMemberDto) {
    const tenant = tenantId(session);
    const memberRole = body.role;
    const account = await prepareAccount(body);
    await transaction(this.prisma, async (tx) => {
      await ensureMemberCapacity(tx, tenant);
      const user = await resolveAccount(tx, account);
      await tx.tenantMembership.create({
        data: { tenantId: tenant, userId: user.id, role: memberRole },
      });
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
        current.role === 'admin' &&
        current.isActive &&
        (!isActive || nextRole !== 'admin')
      ) {
        const admins = await tx.tenantMembership.count({
          where: { tenantId: tenant, role: 'admin', isActive: true },
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
        if (!isActive)
          await tx.session.deleteMany({ where: { tenantId: tenant, userId } });
      }
    });
    return success(null);
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
