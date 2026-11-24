import type { RetrievalConfig, SourceRef } from '../common/ai.types.js';
import type { AiAccessContext } from '../knowledge/knowledge-access.service.js';

export interface RetrievalContext extends AiAccessContext {
  assistantId: bigint;
  documentId?: bigint;
  question: string;
  config: RetrievalConfig;
}
export interface RetrievalHit {
  source: SourceRef;
  content: string;
  score: number;
  reliable: boolean;
}
export interface RetrievalStrategy {
  search(context: RetrievalContext): Promise<RetrievalHit[]>;
}
