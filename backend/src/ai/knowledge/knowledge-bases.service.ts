import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../../audit/audit-action.js';
import type { PaginationQueryDto } from '../../common/dto/request.dto.js';
import { id, json, pagination, success } from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  CreateAiKnowledgeBaseDto,
  UpdateAiKnowledgeBaseDto,
} from './dto/knowledge-base-request.dto.js';

@Injectable()
export class KnowledgeBasesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiKnowledgeBase.findMany({
        ...pagination(query),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isActive: true,
          revision: true,
        },
      }),
      this.prisma.aiKnowledgeBase.count(),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  @AuditAction({
    event: 'ai.knowledge-base.create',
    name: '创建 AI 知识库',
    entity: 'aiKnowledgeBase',
  })
  async create(body: CreateAiKnowledgeBaseDto) {
    await this.prisma.aiKnowledgeBase.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        isActive: body.isActive,
      },
    });
    return success(null);
  }

  @AuditAction({
    event: 'ai.knowledge-base.update',
    name: '修改 AI 知识库',
    entity: 'aiKnowledgeBase',
  })
  async update(value: string, body: UpdateAiKnowledgeBaseDto) {
    const current = await this.prisma.aiKnowledgeBase.findUniqueOrThrow({
      where: { id: id(value) },
    });
    if (current.revision !== body.revision)
      throw new ConflictException('知识库已修改，请刷新');
    await this.prisma.aiKnowledgeBase.update({
      where: { id: current.id, revision: body.revision },
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        isActive: body.isActive,
        revision: { increment: 1 },
      },
    });
    return success(null);
  }

  @AuditAction({
    event: 'ai.knowledge-base.delete',
    name: '删除 AI 知识库',
    entity: 'aiKnowledgeBase',
  })
  async delete(value: string) {
    await this.prisma.aiKnowledgeBase.delete({ where: { id: id(value) } });
    return success(null);
  }
}
