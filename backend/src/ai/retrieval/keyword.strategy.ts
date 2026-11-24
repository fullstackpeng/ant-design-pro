import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { normalizeQuestion } from '../common/ai.types.js';
import { AuthorizedKnowledgeQuery } from './authorized-knowledge.query.js';
import type { RetrievalContext, RetrievalStrategy } from './retrieval.types.js';

@Injectable()
export class KeywordStrategy implements RetrievalStrategy {
  constructor(
    @Inject(AuthorizedKnowledgeQuery)
    private readonly query: AuthorizedKnowledgeQuery,
  ) {}

  async search(context: RetrievalContext) {
    const question = normalizeQuestion(context.question);
    const rows = await this.query.prisma.$queryRaw<
      { id: bigint; score: number; alias: boolean }[]
    >(Prisma.sql`
      SELECT d.id, (SELECT count(DISTINCT term)::int FROM unnest(d.keywords || d.synonyms || d.normalized_questions) term
        WHERE length(term)>=2 AND position(lower(term) in ${question})>0) AS score,
        ${question}=ANY(d.synonyms) AS alias
      FROM ${this.query.table('knowledge_documents')} d WHERE ${this.query.scope(context)}
      AND EXISTS (SELECT 1 FROM unnest(d.keywords || d.synonyms || d.normalized_questions) term WHERE length(term)>=2 AND position(lower(term) in ${question})>0)
      ORDER BY score DESC,d.id LIMIT ${Math.max(2, context.config.topK)}`);
    if (rows.length) {
      const hits = await this.query.hits(context, {
        id: { in: rows.map((row) => row.id) },
      });
      return hits
        .map((hit) => ({
          ...hit,
          score:
            rows.find((row) => row.id.toString() === hit.source.documentId)
              ?.score ?? 0,
          reliable:
            rows.some(
              (row) => row.id.toString() === hit.source.documentId && row.alias,
            ) ||
            (rows.find((row) => row.id.toString() === hit.source.documentId)
              ?.score ?? 0) >= 2,
        }))
        .sort((a, b) => b.score - a.score);
    }
    if (!context.config.trigram) return [];
    const extensions = await this.query.prisma.$queryRaw<
      { schema: string }[]
    >`SELECT n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pg_trgm'`;
    if (!extensions[0]) return [];
    // Identifier comes only from PostgreSQL metadata and is quoted, never from user configuration.
    const similarity = Prisma.raw(
      `"${extensions[0].schema.replaceAll('"', '""')}".similarity`,
    );
    const fuzzy = await this.query.prisma.$queryRaw<
      { id: bigint; score: number }[]
    >(Prisma.sql`
      SELECT d.id, (SELECT max(${similarity}(term,${question})) FROM unnest(d.normalized_questions) term) AS score
      FROM ${this.query.table('knowledge_documents')} d WHERE ${this.query.scope(context)}
      AND EXISTS(SELECT 1 FROM unnest(d.normalized_questions) term WHERE ${similarity}(term,${question})>=0.65)
      ORDER BY score DESC,d.id LIMIT ${Math.max(2, context.config.topK)}`);
    const hits = await this.query.hits(context, {
      id: { in: fuzzy.map((row) => row.id) },
    });
    return hits
      .map((hit) => ({
        ...hit,
        score:
          fuzzy.find((row) => row.id.toString() === hit.source.documentId)
            ?.score ?? 0,
        reliable:
          (fuzzy.find((row) => row.id.toString() === hit.source.documentId)
            ?.score ?? 0) >= 0.85,
      }))
      .sort((a, b) => b.score - a.score);
  }
}
