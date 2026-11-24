import * as ai from '@/services/backend/aiAdmin';
export type KnowledgeBase = BackendAPI.AiKnowledgeBaseDto;
export const list = (params: BackendAPI.listAiKnowledgeBasesParams = {}) =>
  ai.listAiKnowledgeBases(params, { skipErrorHandler: true });
export const create = (body: BackendAPI.CreateAiKnowledgeBaseDto) =>
  ai.createAiKnowledgeBase(body, { skipErrorHandler: true });
export const update = (id: string, body: BackendAPI.UpdateAiKnowledgeBaseDto) =>
  ai.updateAiKnowledgeBase({ id }, body, { skipErrorHandler: true });
export const remove = (id: string) =>
  ai.deleteAiKnowledgeBase({ id }, { skipErrorHandler: true });
