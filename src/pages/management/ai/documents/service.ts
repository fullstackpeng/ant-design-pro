import * as ai from '@/services/backend/aiAdmin';
export type Document = BackendAPI.AiDocumentDto;
export const list = (params: BackendAPI.listAiDocumentsParams = {}) =>
  ai.listAiDocuments(params, { skipErrorHandler: true });
export const create = (body: BackendAPI.CreateAiDocumentDto) =>
  ai.createAiDocument(body, { skipErrorHandler: true });
export const update = (id: string, body: BackendAPI.UpdateAiDocumentDto) =>
  ai.updateAiDocument({ id }, body, { skipErrorHandler: true });
export const remove = (id: string) =>
  ai.deleteAiDocument({ id }, { skipErrorHandler: true });
export const getOptions = () => ai.getAiOptions({ skipErrorHandler: true });
export const knowledgeBases = async () => {
  const rows: BackendAPI.AiKnowledgeBaseDto[] = [];
  for (let current = 1; ; current++) {
    const result = await ai.listAiKnowledgeBases(
      { current, pageSize: 100 },
      { skipErrorHandler: true },
    );
    rows.push(...result.data);
    if (rows.length >= result.total)
      return rows.map((r) => ({ value: r.id, label: r.name }));
  }
};
