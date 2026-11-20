import { Inject, Injectable } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import {
  id,
  invalid,
  json,
  pagination,
  success,
  tenantId,
} from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CreateDictionaryDto,
  CreateDictionaryItemDto,
  DictionaryQueryDto,
  UpdateDictionaryDto,
  UpdateDictionaryItemDto,
} from './dto/dictionary-request.dto.js';

const typeSelect = {
  code: true,
  name: true,
  remark: true,
  isActive: true,
} as const;
const itemSelect = {
  id: true,
  value: true,
  label: true,
  sortOrder: true,
  isActive: true,
  color: true,
} as const;

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
    await this.prisma.dictionaryType.create({
      data: {
        tenantId: tenantId(session),
        code: body.code,
        name: body.name,
        remark: body.remark,
        isActive: body.isActive,
      },
    });
    return success(null);
  }

  async update(
    session: SessionContext,
    code: string,
    body: UpdateDictionaryDto,
  ) {
    await this.prisma.dictionaryType.update({
      where: { tenantId_code: { tenantId: tenantId(session), code } },
      data: { name: body.name, remark: body.remark, isActive: body.isActive },
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
      await tx.dictionaryItem.create({
        data: {
          tenantId: tenant,
          dictionaryId: dictionary.id,
          value: body.value,
          label: body.label,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          color: body.color,
        },
      });
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
      await tx.dictionaryItem.update({
        where,
        data: {
          label: body.label,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          color: body.color,
        },
      });
    });
    return success(null);
  }

  /** Call within the business write transaction. Previous values must come from the persisted record. */
  async validateValues(
    tx: Prisma.TransactionClient,
    session: SessionContext,
    code: string,
    values: string[],
    previousValues: string[] = [],
  ) {
    const dictionary = await tx.dictionaryType.findUniqueOrThrow({
      where: { tenantId_code: { tenantId: tenantId(session), code } },
      select: {
        isActive: true,
        items: { select: { value: true, isActive: true } },
      },
    });
    if (new Set(values).size !== values.length) invalid('字典值不能重复');
    for (const value of values) {
      const item = dictionary.items.find((entry) => entry.value === value);
      if (
        !item ||
        ((!dictionary.isActive || !item.isActive) &&
          !previousValues.includes(value))
      )
        invalid('字典选项不存在或已停用');
    }
  }
}
