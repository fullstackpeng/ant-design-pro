import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuditAction } from '../../audit/audit-action.js';
import { auditContext, recordAuditTarget } from '../../audit/audit-context.js';
import type { SessionContext } from '../../auth/session-context.js';
import { id, invalid, success } from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AssistantService } from '../assistant/assistant.service.js';
import { type AiAnswer, NO_MATCH } from '../common/ai.types.js';
import { ConversationsService } from '../conversation/conversations.service.js';
import { KnowledgeAccessService } from '../knowledge/knowledge-access.service.js';
import { RetrievalRegistry } from '../retrieval/retrieval.registry.js';
import type { RetrievalContext } from '../retrieval/retrieval.types.js';
import type { AiChatRequestDto } from './dto/chat-request.dto.js';

@Injectable()
export class AiOrchestratorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KnowledgeAccessService)
    private readonly access: KnowledgeAccessService,
    @Inject(AssistantService) private readonly assistants: AssistantService,
    @Inject(ConversationsService)
    private readonly conversations: ConversationsService,
    @Inject(RetrievalRegistry) private readonly retrieval: RetrievalRegistry,
  ) {}

  private async answer(context: RetrievalContext): Promise<AiAnswer> {
    for (const { name, strategy } of this.retrieval.pipeline(context)) {
      const hits = await strategy.search(context);
      if (!hits.length) continue;
      if (hits.length === 1 && hits[0].reliable)
        return {
          kind: 'direct',
          content: hits[0].content,
          sources: [hits[0].source],
          strategy: name,
        };
      return {
        kind: 'candidates',
        content: '请明确您要了解的操作，或选择以下可访问的指南。',
        sources: hits.slice(0, context.config.topK).map((hit) => hit.source),
        strategy: name,
      };
    }
    return {
      kind: 'no-match',
      content: NO_MATCH,
      sources: [],
      strategy: 'none',
    };
  }

  @AuditAction({
    event: 'ai.chat',
    name: 'AI 操作问答',
    entity: 'aiConversation',
  })
  async chat(session: SessionContext, body: AiChatRequestDto) {
    const context = await this.access.context(session);
    const [lock] = await this.prisma.$queryRaw<
      { locked: boolean }[]
    >`SELECT pg_try_advisory_xact_lock(hashtextextended(${`ai-chat:${context.tenantId}:${context.userId}`}, 0)) AS locked`;
    if (!lock?.locked) throw new ConflictException('上一条问答仍在处理中');
    // Audit records are immutable through application APIs, so deleting a conversation cannot reset this limit.
    const recent = await this.prisma.operationLog.count({
      where: {
        scope: 'tenant',
        tenantId: context.tenantId,
        actorId: context.userId,
        eventCode: 'ai.chat',
        result: 'succeeded',
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });
    if (recent >= 20) throw new HttpException('提问过于频繁，请稍后重试', 429);
    // Resolve inside the audited serializable transaction so configuration, ACLs and answer use one snapshot.
    const assistant = await this.assistants.require(
      context,
      id(body.assistantId),
    );
    let conversation = body.conversationId
      ? await this.conversations.require(context, body.conversationId)
      : null;
    if (conversation && conversation.assistantId !== assistant.id)
      invalid('会话与助手不匹配');
    const count = conversation
      ? await this.prisma.aiMessage.count({
          where: {
            conversationId: conversation.id,
            tenantId: context.tenantId,
          },
        })
      : 0;
    if (count >= 200) invalid('会话已达 100 轮，请新建对话');
    const answer = await this.answer({
      ...context,
      assistantId: assistant.id,
      question: body.question,
      documentId: body.documentId ? id(body.documentId) : undefined,
      config: assistant.config,
    });
    conversation = conversation
      ? await this.prisma.aiConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        })
      : await this.prisma.aiConversation.create({
          data: {
            tenantId: context.tenantId,
            userId: context.userId,
            assistantId: assistant.id,
          },
        });
    const requestId = auditContext.getStore()?.requestId ?? randomUUID();
    const sourceRefs = answer.sources as unknown as Prisma.InputJsonValue;
    await this.prisma.aiMessage.createMany({
      data: [
        {
          tenantId: context.tenantId,
          conversationId: conversation.id,
          sequence: count,
          requestId,
          role: 'user',
          content: body.question,
          sourceRefs,
          status: 'completed',
        },
        {
          tenantId: context.tenantId,
          conversationId: conversation.id,
          sequence: count + 1,
          requestId,
          role: 'assistant',
          content: answer.content,
          sourceRefs,
          status: 'completed',
        },
      ],
    });
    recordAuditTarget('aiConversation', {
      id: conversation.id,
      tenantId: context.tenantId,
      userId: context.userId,
    });
    return success({
      ...answer,
      conversationId: conversation.id.toString(),
      requestId,
    });
  }
}
