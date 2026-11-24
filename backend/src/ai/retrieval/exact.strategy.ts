import { Inject, Injectable } from '@nestjs/common';
import { normalizeQuestion } from '../common/ai.types.js';
import { AuthorizedKnowledgeQuery } from './authorized-knowledge.query.js';
import type { RetrievalContext, RetrievalStrategy } from './retrieval.types.js';

@Injectable()
export class ExactStrategy implements RetrievalStrategy {
  constructor(
    @Inject(AuthorizedKnowledgeQuery)
    private readonly query: AuthorizedKnowledgeQuery,
  ) {}
  search(context: RetrievalContext) {
    return this.query.hits(context, {
      normalizedQuestions: { has: normalizeQuestion(context.question) },
    });
  }
}
