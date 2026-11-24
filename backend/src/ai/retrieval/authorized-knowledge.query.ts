import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { KnowledgeAccessService } from '../knowledge/knowledge-access.service.js';
import type { RetrievalContext, RetrievalHit } from './retrieval.types.js';

@Injectable()
export class AuthorizedKnowledgeQuery {
  constructor(
    @Inject(PrismaService) readonly prisma: PrismaService,
    @Inject(KnowledgeAccessService)
    private readonly access: KnowledgeAccessService,
  ) {}

  table(
    name:
      | 'knowledge_documents'
      | 'knowledge_bases'
      | 'assistant_knowledge_bases'
      | 'assistants'
      | 'assistant_tenants'
      | 'assistant_permissions'
      | 'knowledge_permissions',
  ) {
    // Match prisma.factory.ts: raw SQL does not inherit the pg adapter's schema qualification.
    const schema =
      new URL(
        process.env.DATABASE_URL ?? 'postgresql://unused/unused',
      ).searchParams.get('schema') ?? 'public';
    return Prisma.raw(`"${schema.replaceAll('"', '""')}"."app_ai_${name}"`);
  }

  async hits(
    context: RetrievalContext,
    where: Prisma.AiKnowledgeDocumentWhereInput,
  ): Promise<RetrievalHit[]> {
    const documents = await this.prisma.aiKnowledgeDocument.findMany({
      where: {
        AND: [this.access.documents(context, context.assistantId), where],
      },
      orderBy: { id: 'asc' },
      take: Math.max(2, context.config.topK),
      include: { chunks: { orderBy: { sequence: 'asc' }, take: 1 } },
    });
    return documents.flatMap((document) => {
      const chunk = document.chunks[0];
      if (!chunk || chunk.contentVersion !== document.version) return [];
      return [
        {
          content: chunk.content,
          score: 1,
          reliable: true,
          source: {
            documentId: document.id.toString(),
            chunkId: chunk.id.toString(),
            version: document.version,
            title: document.title,
            route:
              context.pages.find((page) => page.code === document.pageCode)
                ?.path ?? null,
          },
        },
      ];
    });
  }

  // Raw strategies use the same full authorization predicates inside SQL, before scoring/limiting.
  scope(context: RetrievalContext): Prisma.Sql {
    const granted = context.permissions.length
      ? Prisma.join(context.permissions)
      : Prisma.sql`''`;
    return Prisma.sql`d.status='published'
      AND EXISTS (SELECT 1 FROM ${this.table('knowledge_bases')} kb
        JOIN ${this.table('assistant_knowledge_bases')} ak ON ak.knowledge_base_id=kb.id
        JOIN ${this.table('assistants')} a ON a.id=ak.assistant_id
        WHERE kb.id=d.knowledge_base_id AND kb.is_active AND a.id=${context.assistantId} AND a.is_active
        AND (a.publication_scope='all' OR (a.publication_scope='selected' AND EXISTS (SELECT 1 FROM ${this.table('assistant_tenants')} atn WHERE atn.assistant_id=a.id AND atn.tenant_id=${context.tenantId})))
        AND (a.is_public OR (EXISTS (SELECT 1 FROM ${this.table('assistant_permissions')} ap WHERE ap.assistant_id=a.id)
          AND ((a.permission_mode='ALL' AND NOT EXISTS (SELECT 1 FROM ${this.table('assistant_permissions')} ap WHERE ap.assistant_id=a.id AND ap.permission_code NOT IN (${granted})))
          OR (a.permission_mode='ANY' AND EXISTS (SELECT 1 FROM ${this.table('assistant_permissions')} ap WHERE ap.assistant_id=a.id AND ap.permission_code IN (${granted})))))))
      AND (d.is_public OR (EXISTS (SELECT 1 FROM ${this.table('knowledge_permissions')} dp WHERE dp.document_id=d.id)
        AND ((d.permission_mode='ALL' AND NOT EXISTS (SELECT 1 FROM ${this.table('knowledge_permissions')} dp WHERE dp.document_id=d.id AND dp.permission_code NOT IN (${granted})))
        OR (d.permission_mode='ANY' AND EXISTS (SELECT 1 FROM ${this.table('knowledge_permissions')} dp WHERE dp.document_id=d.id AND dp.permission_code IN (${granted}))))))`;
  }
}
