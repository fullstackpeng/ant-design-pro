import { Inject, Injectable } from '@nestjs/common';
import { ExactStrategy } from './exact.strategy.js';
import { KeywordStrategy } from './keyword.strategy.js';
import type { RetrievalContext, RetrievalStrategy } from './retrieval.types.js';
import { SelectionStrategy } from './selection.strategy.js';

@Injectable()
export class RetrievalRegistry {
  private readonly strategies: {
    name: string;
    strategy: RetrievalStrategy;
    enabled: (context: RetrievalContext) => boolean;
  }[];
  constructor(
    @Inject(ExactStrategy) exact: ExactStrategy,
    @Inject(KeywordStrategy) keyword: KeywordStrategy,
    @Inject(SelectionStrategy) selection: SelectionStrategy,
  ) {
    this.strategies = [
      {
        name: 'selection',
        strategy: selection,
        enabled: (context) => context.documentId !== undefined,
      },
      {
        name: 'exact',
        strategy: exact,
        enabled: (context) =>
          context.documentId === undefined && context.config.exact,
      },
      {
        name: 'keyword',
        strategy: keyword,
        enabled: (context) =>
          context.documentId === undefined && context.config.keyword,
      },
    ];
  }
  pipeline(context: RetrievalContext) {
    return this.strategies.filter((definition) => definition.enabled(context));
  }
}
