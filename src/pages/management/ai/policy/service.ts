import * as ai from '@/services/backend/aiAdmin';
export const getPolicy = () => ai.getAiPolicy({ skipErrorHandler: true });
export const updatePolicy = (body: BackendAPI.UpdateAiPolicyDto) =>
  ai.updateAiPolicy(body, { skipErrorHandler: true });
