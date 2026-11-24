import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '../../audit/audit-action.js';
import { auditContext, auditSnapshot } from '../../audit/audit-context.js';
import type { PaginationQueryDto } from '../../common/dto/request.dto.js';
import {
  id,
  invalid,
  json,
  pagination,
  success,
} from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  type AiAccessContext,
  KnowledgeAccessService,
} from '../knowledge/knowledge-access.service.js';
import { retrievalConfig } from './assistant-config.js';
import type {
  CreateAiAssistantDto,
  UpdateAiAssistantDto,
} from './dto/assistant-request.dto.js';

@Injectable()
export class AssistantService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KnowledgeAccessService)
    private readonly access: KnowledgeAccessService,
  ) {}

  async list(query: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiAssistant.findMany({
        ...pagination(query),
        orderBy: { id: 'asc' },
        include: { permissions: true, tenants: true, knowledgeBases: true },
      }),
      this.prisma.aiAssistant.count(),
    ]);
    return {
      success: true as const,
      data: json(
        rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          isActive: row.isActive,
          isPublic: row.isPublic,
          permissionMode: row.permissionMode,
          publicationScope: row.publicationScope,
          prompt: row.prompt,
          retrievalConfig: row.retrievalConfig as Record<string, unknown>,
          revision: row.revision,
          permissions: row.permissions.map((p) => p.permissionCode),
          tenantIds: row.tenants.map((t) => t.tenantId),
          knowledgeBaseIds: row.knowledgeBases.map((k) => k.knowledgeBaseId),
        })),
      ),
      total,
    };
  }

  async accessible(context: AiAccessContext) {
    return success(
      await this.prisma.aiAssistant.findMany({
        where: this.access.assistants(context),
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      }),
    );
  }

  async require(context: AiAccessContext, assistantId: bigint) {
    const assistant = await this.prisma.aiAssistant.findFirst({
      where: { id: assistantId, ...this.access.assistants(context) },
    });
    if (!assistant) throw new NotFoundException('助手不可用');
    return { ...assistant, config: retrievalConfig(assistant.retrievalConfig) };
  }

  private async values(body: CreateAiAssistantDto) {
    this.access.validatePermissions(body.permissions);
    const config = retrievalConfig(body.retrievalConfig);
    if (
      body.isActive &&
      (!body.knowledgeBaseIds.length ||
        (!body.isPublic && !body.permissions.length))
    )
      invalid('启用助手需要知识库和明确的访问权限');
    if (body.publicationScope === 'selected' && !body.tenantIds.length)
      invalid('请选择发布租户');
    if (body.publicationScope !== 'selected' && body.tenantIds.length)
      invalid('仅指定租户范围可以配置租户列表');
    if (
      (await this.prisma.tenant.count({
        where: { id: { in: body.tenantIds.map(id) } },
      })) !== body.tenantIds.length
    )
      invalid('包含不存在的租户');
    if (config.trigram) {
      const extensions = await this.prisma.$queryRaw<
        { available: boolean }[]
      >`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_trgm') AS available`;
      if (!extensions[0]?.available) invalid('数据库尚未启用 pg_trgm');
    }
    return {
      code: body.code,
      name: body.name,
      isActive: body.isActive,
      isPublic: body.isPublic,
      permissionMode: body.permissionMode,
      publicationScope: body.publicationScope,
      prompt: body.prompt,
      retrievalConfig: config as unknown as Prisma.InputJsonValue,
    };
  }

  @AuditAction({
    event: 'ai.assistant.create',
    name: '创建 AI 助手',
    entity: 'aiAssistant',
  })
  async create(body: CreateAiAssistantDto) {
    const created = await this.prisma.aiAssistant.create({
      data: {
        ...(await this.values(body)),
        permissions: {
          create: body.permissions.map((permissionCode) => ({
            permissionCode,
          })),
        },
        tenants: {
          create: body.tenantIds.map((tenantId) => ({
            tenantId: id(tenantId),
          })),
        },
        knowledgeBases: {
          create: body.knowledgeBaseIds.map((knowledgeBaseId) => ({
            knowledgeBaseId: id(knowledgeBaseId),
          })),
        },
      },
    });
    auditContext.getStore()?.action?.changes.push({
      entity: 'aiAssistantRetrieval',
      operation: 'create',
      before: {},
      after: auditSnapshot({
        id: created.id,
        ...retrievalConfig(created.retrievalConfig),
      }),
    });
    return success(null);
  }

  @AuditAction({
    event: 'ai.assistant.update',
    name: '修改 AI 助手',
    entity: 'aiAssistant',
  })
  async update(value: string, body: UpdateAiAssistantDto) {
    const current = await this.prisma.aiAssistant.findUniqueOrThrow({
      where: { id: id(value) },
    });
    if (current.revision !== body.revision)
      throw new ConflictException('助手已修改，请刷新');
    const updated = await this.prisma.aiAssistant.update({
      where: { id: current.id, revision: body.revision },
      data: {
        ...(await this.values(body)),
        revision: { increment: 1 },
        permissions: {
          deleteMany: {},
          create: body.permissions.map((permissionCode) => ({
            permissionCode,
          })),
        },
        tenants: {
          deleteMany: {},
          create: body.tenantIds.map((tenantId) => ({
            tenantId: id(tenantId),
          })),
        },
        knowledgeBases: {
          deleteMany: {},
          create: body.knowledgeBaseIds.map((knowledgeBaseId) => ({
            knowledgeBaseId: id(knowledgeBaseId),
          })),
        },
      },
    });
    auditContext.getStore()?.action?.changes.push({
      entity: 'aiAssistantRetrieval',
      operation: 'update',
      before: auditSnapshot({
        id: current.id,
        ...retrievalConfig(current.retrievalConfig),
      }),
      after: auditSnapshot({
        id: updated.id,
        ...retrievalConfig(updated.retrievalConfig),
      }),
    });
    return success(null);
  }

  @AuditAction({
    event: 'ai.assistant.delete',
    name: '删除 AI 助手',
    entity: 'aiAssistant',
  })
  async delete(value: string) {
    await this.prisma.aiAssistant.delete({ where: { id: id(value) } });
    return success(null);
  }
}
