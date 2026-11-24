export interface RetrievalConfig {
  exact: boolean;
  keyword: boolean;
  trigram: boolean;
  vector: false;
  topK: number;
}

export interface SourceRef {
  documentId: string;
  chunkId: string;
  version: number;
  title: string;
  route: string | null;
}

export interface AiAnswer {
  kind: 'direct' | 'candidates' | 'no-match';
  content: string;
  sources: SourceRef[];
  strategy: string;
}

export const NO_MATCH = '暂无您可访问的相关操作指南';
export const HIDDEN_MESSAGE = '该消息的知识来源已失效或无权访问';

export function normalizeQuestion(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, '');
}
