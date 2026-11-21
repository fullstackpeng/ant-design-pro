import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import { id, json, pagination, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import { recordDictionaryAudit } from './dictionary-audit.js';
import {
  dictionaryItemSelect,
  dictionaryTypeSelect,
} from './dictionary-reference.js';
import type {
  CreateDictionaryDto,
  CreateDictionaryItemDto,
  DictionaryQueryDto,
} from './dto/dictionary-request.dto.js';
import type {
  UpdatePlatformDictionaryDto,
  UpdatePlatformDictionaryItemDto,
} from './dto/platform-dictionary-request.dto.js';

const typeSelect = { ...dictionaryTypeSelect, revision: true } as const;
const itemSelect = { ...dictionaryItemSelect, revision: true } as const;

function requireRevision(current: number, expected: number) {
  if (current !== expected)
    throw new ConflictException({
      success: false,
      errorMessage: '字典已被其他管理员修改，请刷新后重新编辑',
    });
}

@Injectable()
export class PlatformDictionariesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: DictionaryQueryDto) {
    const where = query.keyword
      ? {
          OR: [
            { code: { contains: query.keyword, mode: 'insensitive' as const } },
            { name: { contains: query.keyword, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.platformDictionaryType.findMany({
        where,
        ...pagination(query),
        select: typeSelect,
        orderBy: { code: 'asc' },
      }),
      this.prisma.platformDictionaryType.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async detail(code: string) {
    return success(
      await this.prisma.platformDictionaryType.findUniqueOrThrow({
        where: { code },
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
      const after = await tx.platformDictionaryType.create({
        data: {
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
        { scope: 'platform', code: body.code },
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
    body: UpdatePlatformDictionaryDto,
  ) {
    await transaction(this.prisma, async (tx) => {
      const before = await tx.platformDictionaryType.findUniqueOrThrow({
        where: { code },
        select: typeSelect,
      });
      requireRevision(before.revision, body.revision);
      const after = await tx.platformDictionaryType.update({
        where: { code },
        data: {
          name: body.name,
          remark: body.remark,
          isActive: body.isActive,
          revision: { increment: 1 },
        },
        select: typeSelect,
      });
      await recordDictionaryAudit(
        tx,
        session,
        { scope: 'platform', code },
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
    await transaction(this.prisma, async (tx) => {
      const dictionary = await tx.platformDictionaryType.findUniqueOrThrow({
        where: { code },
        select: { id: true },
      });
      const after = await tx.platformDictionaryItem.create({
        data: {
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
        { scope: 'platform', code },
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
    body: UpdatePlatformDictionaryItemDto,
  ) {
    await transaction(this.prisma, async (tx) => {
      const dictionary = await tx.platformDictionaryType.findUniqueOrThrow({
        where: { code },
        select: { id: true },
      });
      const where = { id: id(itemId), dictionaryId: dictionary.id };
      const before = await tx.platformDictionaryItem.findUniqueOrThrow({
        where,
        select: itemSelect,
      });
      requireRevision(before.revision, body.revision);
      const after = await tx.platformDictionaryItem.update({
        where,
        data: {
          label: body.label,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          color: body.color,
          revision: { increment: 1 },
        },
        select: itemSelect,
      });
      await recordDictionaryAudit(
        tx,
        session,
        { scope: 'platform', code },
        'item',
        'update',
        before,
        after,
        after.value,
      );
    });
    return success(null);
  }
}
