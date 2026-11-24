import * as ai from '@/services/backend/ai';
export const listAssistants = () => ai.listAccessibleAiAssistants();
export const listConversations = (current = 1) =>
  ai.listAiConversations({ current, pageSize: 20 });
export const ask = (body: BackendAPI.AiChatRequestDto) => ai.askAi(body);
export const deleteConversation = (id: string) =>
  ai.deleteAiConversation({ id });
export async function listMessages(id: string) {
  const first = await ai.listAiMessages({ id, current: 1, pageSize: 100 });
  if (first.total <= 100) return first.data;
  const second = await ai.listAiMessages({ id, current: 2, pageSize: 100 });
  return [...first.data, ...second.data];
}
