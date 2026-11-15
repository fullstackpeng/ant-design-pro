import * as platform from '@/services/backend/platform';

export type Plan = BackendAPI.PlanDto;
export const listPlans = (params: BackendAPI.listPlansParams = {}) =>
  platform.listPlans(params, { skipErrorHandler: true });
export const createPlan = (body: BackendAPI.CreatePlanDto) =>
  platform.createPlan(body, { skipErrorHandler: true });
export const updatePlan = (id: string, body: BackendAPI.UpdatePlanDto) =>
  platform.updatePlan({ id }, body, { skipErrorHandler: true });
