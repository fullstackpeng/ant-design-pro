import * as ai from '@/services/backend/aiAdmin';
import * as platform from '@/services/backend/platform';

export { getOptions, knowledgeBases } from '../documents/service';
export type Assistant = BackendAPI.AiAssistantDto;
export const list = (params: BackendAPI.listAiAssistantsParams = {}) =>
  ai.listAiAssistants(params, { skipErrorHandler: true });
export const create = (body: BackendAPI.CreateAiAssistantDto) =>
  ai.createAiAssistant(body, { skipErrorHandler: true });
export const update = (id: string, body: BackendAPI.UpdateAiAssistantDto) =>
  ai.updateAiAssistant({ id }, body, { skipErrorHandler: true });
export const remove = (id: string) =>
  ai.deleteAiAssistant({ id }, { skipErrorHandler: true });
export const tenantOptions = async ({ keyWords }: { keyWords?: string }) => {
  const result = await platform.listTenants(
    { name: keyWords, pageSize: 100 },
    { skipErrorHandler: true },
  );
  return result.data.map((r) => ({ value: r.id, label: r.name }));
};
