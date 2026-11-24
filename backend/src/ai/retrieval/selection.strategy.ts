import { Inject, Injectable } from '@nestjs/common';
import { AuthorizedKnowledgeQuery } from './authorized-knowledge.query.js';
import type { RetrievalContext, RetrievalStrategy } from './retrieval.types.js';

@Injectable()
export class SelectionStrategy implements RetrievalStrategy {
  constructor(
    @Inject(AuthorizedKnowledgeQuery)
    private readonly query: AuthorizedKnowledgeQuery,
  ) {}
  search(context: RetrievalContext) {
    return context.documentId
      ? this.query.hits(context, { id: context.documentId })
      : Promise.resolve([]);
  }
}
