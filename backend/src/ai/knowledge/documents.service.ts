import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../../audit/audit-action.js';
import type { PaginationQueryDto } from '../../common/dto/request.dto.js';
import {
  id,
  invalid,
  json,
  pagination,
  success,
} from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import { normalizeQuestion } from '../common/ai.types.js';
import type {
  CreateAiDocumentDto,
  UpdateAiDocumentDto,
} from './dto/document-request.dto.js';
import { KnowledgeAccessService } from './knowledge-access.service.js';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KnowledgeAccessService)
    private readonly access: KnowledgeAccessService,
  ) {}

  async list(query: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiKnowledgeDocument.findMany({
        ...pagination(query),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          knowledgeBaseId: true,
          title: true,
          standardQuestions: true,
          synonyms: true,
          keywords: true,
          content: true,
          steps: true,
          pageCode: true,
          status: true,
          isPublic: true,
          permissionMode: true,
          version: true,
          revision: true,
          permissions: { select: { permissionCode: true } },
        },
      }),
      this.prisma.aiKnowledgeDocument.count(),
    ]);
    return {
      success: true as const,
      data: json(
        rows.map((row) => ({
          ...row,
          permissions: row.permissions.map((p) => p.permissionCode),
        })),
      ),
      total,
    };
  }

  private values(body: CreateAiDocumentDto) {
    if (body.content.length + body.steps.join('\n').length > 20000)
      invalid('操作说明和步骤合计不能超过 20000 字符');
    this.access.validatePermissions(body.permissions);
    this.access.validatePage(body.pageCode);
    const normalizedQuestions = [
      ...new Set(body.standardQuestions.map(normalizeQuestion)),
    ];
    if (normalizedQuestions.some((q) => !q)) invalid('标准问题不能为空');
    if (
      body.status === 'published' &&
      (!normalizedQuestions.length ||
        (!body.isPublic && !body.permissions.length))
    )
      invalid('发布需要标准问题和明确的访问权限');
    return {
      knowledgeBaseId: id(body.knowledgeBaseId),
      title: body.title,
      standardQuestions: body.standardQuestions,
      normalizedQuestions,
      synonyms: [
        ...new Set(body.synonyms.map(normalizeQuestion).filter(Boolean)),
      ],
      keywords: [
        ...new Set(body.keywords.map(normalizeQuestion).filter(Boolean)),
      ],
      content: body.content,
      steps: body.steps,
      pageCode: body.pageCode || null,
      status: body.status,
      isPublic: body.isPublic,
      permissionMode: body.permissionMode,
    };
  }

  private chunk(body: CreateAiDocumentDto, version: number) {
    return {
      content: [
        body.content,
        ...body.steps.map((step, index) => `${index + 1}. ${step}`),
      ].join('\n'),
      keywords: body.keywords,
      sequence: 0,
      contentVersion: version,
    };
  }

  @AuditAction({
    event: 'ai.document.create',
    name: '创建 AI 操作指南',
    entity: 'aiKnowledgeDocument',
  })
  async create(body: CreateAiDocumentDto) {
    await this.prisma.aiKnowledgeDocument.create({
      data: {
        ...this.values(body),
        permissions: {
          create: body.permissions.map((permissionCode) => ({
            permissionCode,
          })),
        },
        chunks: { create: this.chunk(body, 1) },
      },
    });
    return success(null);
  }

  @AuditAction({
    event: 'ai.document.update',
    name: '修改 AI 操作指南',
    entity: 'aiKnowledgeDocument',
  })
  async update(value: string, body: UpdateAiDocumentDto) {
    const current = await this.prisma.aiKnowledgeDocument.findUniqueOrThrow({
      where: { id: id(value) },
    });
    if (current.revision !== body.revision)
      throw new ConflictException('操作指南已修改，请刷新');
    await this.prisma.aiKnowledgeDocument.update({
      where: { id: current.id, revision: body.revision },
      data: {
        ...this.values(body),
        version: { increment: 1 },
        revision: { increment: 1 },
        permissions: {
          deleteMany: {},
          create: body.permissions.map((permissionCode) => ({
            permissionCode,
          })),
        },
        chunks: {
          deleteMany: {},
          create: this.chunk(body, current.version + 1),
        },
      },
    });
    return success(null);
  }

  @AuditAction({
    event: 'ai.document.delete',
    name: '删除 AI 操作指南',
    entity: 'aiKnowledgeDocument',
  })
  async delete(value: string) {
    await this.prisma.aiKnowledgeDocument.delete({ where: { id: id(value) } });
    return success(null);
  }
}
