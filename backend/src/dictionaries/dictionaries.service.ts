import { Inject, Injectable } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import type { PaginationQueryDto } from '../common/dto/request.dto.js';
import {
  id,
  json,
  pagination,
  success,
  tenantId,
} from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { recordDictionaryAudit } from './dictionary-audit.js';
import {
  assertDictionaryValues,
  type DictionaryReference,
  dictionaryItemSelect as itemSelect,
  dictionaryTypeSelect as typeSelect,
} from './dictionary-reference.js';
import type {
  CreateDictionaryDto,
  CreateDictionaryItemDto,
  DictionaryQueryDto,
  UpdateDictionaryDto,
  UpdateDictionaryItemDto,
} from './dto/dictionary-request.dto.js';
import type { DictionaryAuditDto } from './dto/dictionary-response.dto.js';

@Injectable()
export class DictionariesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(session: SessionContext, query: DictionaryQueryDto) {
    const where = {
      tenantId: tenantId(session),
      ...(query.keyword
        ? {
            OR: [
              {
                code: { contains: query.keyword, mode: 'insensitive' as const },
              },
              {
                name: { contains: query.keyword, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dictionaryType.findMany({
        where,
        ...pagination(query),
        select: typeSelect,
        orderBy: { code: 'asc' },
      }),
      this.prisma.dictionaryType.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async detail(session: SessionContext, code: string) {
    return success(
      await this.prisma.dictionaryType.findUniqueOrThrow({
        where: { tenantId_code: { tenantId: tenantId(session), code } },
        select: {
          ...typeSelect,
          items: {
            select: itemSelect,
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
  }

  async create(session: SessionContext, body: CreateDictionaryDto) {
    await transaction(this.prisma, async (tx) => {
      const after = await tx.dictionaryType.create({
        data: {
          tenantId: tenantId(session),
          code: body.code,
          name: body.name,
          remark: body.remark,
          isActive: body.isActive,
        },
        select: typeSelect,
      });
      await recordDictionaryAudit(
        tx,
        session,
        { scope: 'tenant', code: body.code },
        'type',
        'create',
        {},
        after,
      );
    });
    return success(null);
  }

  async update(
    session: SessionContext,
    code: string,
    body: UpdateDictionaryDto,
  ) {
    await transaction(this.prisma, async (tx) => {
      const where = { tenantId_code: { tenantId: tenantId(session), code } };
      const before = await tx.dictionaryType.findUniqueOrThrow({
        where,
        select: typeSelect,
      });
      const after = await tx.dictionaryType.update({
        where,
        data: { name: body.name, remark: body.remark, isActive: body.isActive },
        select: typeSelect,
      });
      await recordDictionaryAudit(
        tx,
        session,
        { scope: 'tenant', code },
        'type',
        'update',
        before,
        after,
      );
    });
    return success(null);
  }

  async createItem(
    session: SessionContext,
    code: string,
    body: CreateDictionaryItemDto,
  ) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const dictionary = await tx.dictionaryType.findUniqueOrThrow({
        where: { tenantId_code: { tenantId: tenant, code } },
      });
      const after = await tx.dictionaryItem.create({
        data: {
          tenantId: tenant,
          dictionaryId: dictionary.id,
          value: body.value,
          label: body.label,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          color: body.color,
        },
        select: itemSelect,
      });
      await recordDictionaryAudit(
        tx,
        session,
        { scope: 'tenant', code },
        'item',
        'create',
        {},
        after,
        after.value,
      );
    });
    return success(null);
  }

  async updateItem(
    session: SessionContext,
    code: string,
    itemId: string,
    body: UpdateDictionaryItemDto,
  ) {
    const tenant = tenantId(session);
    await transaction(this.prisma, async (tx) => {
      const dictionary = await tx.dictionaryType.findUniqueOrThrow({
        where: { tenantId_code: { tenantId: tenant, code } },
      });
      const where = {
        tenantId_id: { tenantId: tenant, id: id(itemId) },
        dictionaryId: dictionary.id,
      };
      const before = await tx.dictionaryItem.findUniqueOrThrow({
        where,
        select: itemSelect,
      });
      const after = await tx.dictionaryItem.update({
        where,
        data: {
          label: body.label,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          color: body.color,
        },
        select: itemSelect,
      });
      await recordDictionaryAudit(
        tx,
        session,
        { scope: 'tenant', code },
        'item',
        'update',
        before,
        after,
        after.value,
      );
    });
    return success(null);
  }

  /** Call within the business write transaction. Previous values must come from the persisted record. */
  async validateValues(
    tx: Prisma.TransactionClient,
    session: SessionContext,
    reference: DictionaryReference,
    values: string[],
    previousValues: string[] = [],
  ) {
    const select = {
      isActive: true,
      items: { select: { value: true, isActive: true } },
    } as const;
    const dictionary =
      reference.scope === 'platform'
        ? await tx.platformDictionaryType.findUniqueOrThrow({
            where: { code: reference.code },
            select,
          })
        : await tx.dictionaryType.findUniqueOrThrow({
            where: {
              tenantId_code: {
                tenantId: tenantId(session),
                code: reference.code,
              },
            },
            select,
          });
    assertDictionaryValues(dictionary, values, previousValues);
  }

  async history(
    session: SessionContext,
    reference: DictionaryReference,
    query: PaginationQueryDto,
  ) {
    const tenant = reference.scope === 'tenant' ? tenantId(session) : null;
    if (tenant !== null)
      await this.prisma.dictionaryType.findUniqueOrThrow({
        where: { tenantId_code: { tenantId: tenant, code: reference.code } },
        select: { id: true },
      });
    else
      await this.prisma.platformDictionaryType.findUniqueOrThrow({
        where: { code: reference.code },
        select: { id: true },
      });
    const where = {
      scope: reference.scope,
      tenantId: tenant,
      dictionaryCode: reference.code,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dictionaryAudit.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'desc' },
        select: {
          id: true,
          actorId: true,
          actorName: true,
          entityType: true,
          targetValue: true,
          action: true,
          before: true,
          after: true,
          createdAt: true,
        },
      }),
      this.prisma.dictionaryAudit.count({ where }),
    ]);
    return {
      success: true as const,
      data: json(rows) as unknown as DictionaryAuditDto[],
      total,
    };
  }
}
