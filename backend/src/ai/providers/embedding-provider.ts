export interface EmbeddingProvider {
  embed(text: string, signal: AbortSignal): Promise<number[]>;
  embedBatch(texts: string[], signal: AbortSignal): Promise<number[][]>;
}
