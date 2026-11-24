import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '../../audit/audit-action.js';
import { recordAuditTarget } from '../../audit/audit-context.js';
import {
  DatabaseIdConstraint,
  type PaginationQueryDto,
} from '../../common/dto/request.dto.js';
import { id, json, pagination, success } from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  HIDDEN_MESSAGE,
  NO_MATCH,
  type SourceRef,
} from '../common/ai.types.js';
import {
  type AiAccessContext,
  KnowledgeAccessService,
} from '../knowledge/knowledge-access.service.js';
import { AiPolicyService } from './policy.service.js';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KnowledgeAccessService)
    private readonly access: KnowledgeAccessService,
    @Inject(AiPolicyService) private readonly policy: AiPolicyService,
  ) {}

  private async scope(context: AiAccessContext) {
    return {
      tenantId: context.tenantId,
      userId: context.userId,
      updatedAt: { gte: await this.policy.cutoff() },
      assistant: this.access.assistants(context),
    };
  }
  async require(context: AiAccessContext, value: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: id(value), ...(await this.scope(context)) },
    });
    if (!conversation) throw new NotFoundException('会话不存在或已失效');
    return conversation;
  }
  async list(context: AiAccessContext, query: PaginationQueryDto) {
    const where = await this.scope(context);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        ...pagination(query),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, assistantId: true, title: true, updatedAt: true },
      }),
      this.prisma.aiConversation.count({ where }),
    ]);
    return { success: true as const, data: json(rows), total };
  }

  async messages(
    context: AiAccessContext,
    value: string,
    query: PaginationQueryDto,
  ) {
    const conversation = await this.require(context, value);
    const where = {
      tenantId: context.tenantId,
      conversationId: conversation.id,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiMessage.findMany({
        where,
        ...pagination(query),
        orderBy: { sequence: 'asc' },
      }),
      this.prisma.aiMessage.count({ where }),
    ]);
    const visible = [];
    for (const row of rows) {
      const refs = row.sourceRefs as unknown as SourceRef[];
      const sources: SourceRef[] = [];
      let valid = Array.isArray(refs) && refs.length <= 10;
      if (
        valid &&
        row.role === 'assistant' &&
        refs.length === 0 &&
        row.content !== NO_MATCH
      )
        valid = false;
      if (valid)
        for (const ref of refs) {
          if (
            !ref ||
            !new DatabaseIdConstraint().validate(ref.documentId) ||
            !new DatabaseIdConstraint().validate(ref.chunkId) ||
            !Number.isInteger(ref.version) ||
            ref.version < 1
          ) {
            valid = false;
            break;
          }
          const document = await this.prisma.aiKnowledgeDocument.findFirst({
            where: {
              AND: [
                this.access.documents(context, conversation.assistantId),
                {
                  id: id(ref.documentId),
                  version: ref.version,
                  chunks: {
                    some: { id: id(ref.chunkId), contentVersion: ref.version },
                  },
                },
              ],
            },
            select: { id: true, title: true, pageCode: true },
          });
          if (!document) {
            valid = false;
            break;
          }
          sources.push({
            ...ref,
            title: document.title,
            route:
              context.pages.find((page) => page.code === document.pageCode)
                ?.path ?? null,
          });
        }
      // User turns inherit the answer's lineage as well, preventing question snippets from revealing withdrawn guides.
      visible.push({
        id: row.id.toString(),
        role: row.role,
        content: valid ? row.content : HIDDEN_MESSAGE,
        status: valid ? row.status : 'redacted',
        sources: valid && row.role === 'assistant' ? sources : [],
      });
    }
    return { success: true as const, data: visible, total };
  }

  @AuditAction({
    event: 'ai.conversation.delete',
    name: '删除自己的 AI 会话',
    entity: 'aiConversation',
  })
  async delete(context: AiAccessContext, value: string) {
    const conversation = await this.require(context, value);
    recordAuditTarget('aiConversation', {
      id: conversation.id,
      tenantId: context.tenantId,
      userId: context.userId,
    });
    await this.prisma.aiConversation.delete({
      where: {
        id: conversation.id,
        tenantId: context.tenantId,
        userId: context.userId,
      },
    });
    return success(null);
  }
}
