import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import type {
  PaginationQueryDto,
  TenantQueryDto,
} from '../common/dto/request.dto.js';
import {
  expiresAt,
  id,
  json,
  pagination,
  success,
} from '../common/validation.js';
import { prepareAccount, resolveAccount } from '../database/accounts.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import { DictionariesService } from '../dictionaries/dictionaries.service.js';
import type {
  AssignPlanDto,
  CreatePlanDto,
  CreateTenantDto,
  UpdatePlanDto,
  UpdateTenantDto,
} from './dto/platform-request.dto.js';
import { tenantIndustryDictionary } from './tenant.constants.js';

@Injectable()
export class PlatformService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DictionariesService)
    private readonly dictionaries: DictionariesService,
  ) {}

  async tenants(query: TenantQueryDto) {
    const where = query.name
      ? {
          name: { contains: query.name, mode: 'insensitive' as const },
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'asc' },
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { memberships: { where: { isActive: true } } } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async createTenant(session: SessionContext, body: CreateTenantDto) {
    const tenantCode = body.code;
    const name = body.name;
    const account = await prepareAccount(body.admin);
    return success(
      await transaction(this.prisma, async (tx) => {
        if (body.industry)
          await this.dictionaries.validateValues(
            tx,
            session,
            tenantIndustryDictionary,
            [body.industry],
          );
        const user = await resolveAccount(tx, account);
        const tenant = await tx.tenant.create({
          data: { code: tenantCode, name, industry: body.industry ?? '' },
        });
        await tx.tenantMembership.create({
          data: { tenantId: tenant.id, userId: user.id, role: 'admin' },
        });
        return tenant;
      }),
    );
  }

  async updateTenant(
    session: SessionContext,
    tenant: string,
    body: UpdateTenantDto,
  ) {
    return success(
      await transaction(this.prisma, async (tx) => {
        const where = { id: id(tenant) };
        const before = await tx.tenant.findUniqueOrThrow({
          where,
          select: { industry: true },
        });
        if (body.industry)
          await this.dictionaries.validateValues(
            tx,
            session,
            tenantIndustryDictionary,
            [body.industry],
            before.industry ? [before.industry] : [],
          );
        return tx.tenant.update({
          where,
          data: {
            name: body.name,
            isActive: body.isActive,
            ...(body.industry !== undefined ? { industry: body.industry } : {}),
          },
        });
      }),
    );
  }

  async plans(query: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        ...pagination(query),
        orderBy: { id: 'asc' },
      }),
      this.prisma.plan.count(),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async createPlan(body: CreatePlanDto) {
    return success(
      await this.prisma.plan.create({
        data: {
          code: body.code,
          name: body.name,
          maxMembers: body.maxMembers,
          maxStorageMb: body.maxStorageMb,
          maxFileSizeMb: body.maxFileSizeMb,
          isActive: body.isActive,
        },
      }),
    );
  }

  async updatePlan(plan: string, body: UpdatePlanDto) {
    const planId = id(plan);
    const limit = body.maxMembers;
    const storageLimit = BigInt(body.maxStorageMb) * 1024n * 1024n;
    const name = body.name;
    const isActive = body.isActive;
    return success(
      await transaction(this.prisma, async (tx) => {
        const subscriptions = await tx.subscription.findMany({
          where: { planId },
          select: { tenantId: true },
        });
        for (const subscription of subscriptions) {
          const used = await tx.tenantMembership.count({
            where: { tenantId: subscription.tenantId, isActive: true },
          });
          if (used > limit)
            throw new ConflictException({
              success: false,
              errorMessage: '已有租户的启用成员数超过新上限',
            });
          const storage = await tx.fileObject.aggregate({
            _sum: { size: true },
            where: { tenantId: subscription.tenantId },
          });
          if ((storage._sum.size ?? 0n) > storageLimit)
            throw new ConflictException({
              success: false,
              errorMessage: '已有租户的存储用量超过新上限',
            });
        }
        return tx.plan.update({
          where: { id: planId },
          data: {
            name,
            maxMembers: limit,
            maxStorageMb: body.maxStorageMb,
            maxFileSizeMb: body.maxFileSizeMb,
            isActive,
          },
        });
      }),
    );
  }

  async assign(tenant: string, body: AssignPlanDto) {
    const tenantId = id(tenant);
    const planId = id(body.planId);
    const end = expiresAt(body.expiresAt);
    const isActive = body.isActive;
    return success(
      await transaction(this.prisma, async (tx) => {
        await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
        const plan = await tx.plan.findUniqueOrThrow({ where: { id: planId } });
        if (!plan.isActive)
          throw new ConflictException({
            success: false,
            errorMessage: '该套餐已停止分配',
          });
        const used = await tx.tenantMembership.count({
          where: { tenantId, isActive: true },
        });
        if (used > plan.maxMembers)
          throw new ConflictException({
            success: false,
            errorMessage: '启用成员数超过所选套餐上限',
          });
        const data = { planId, startsAt: new Date(), expiresAt: end, isActive };
        return tx.subscription.upsert({
          where: { tenantId },
          create: { tenantId, ...data },
          update: data,
        });
      }),
    );
  }
}
