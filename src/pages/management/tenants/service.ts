import * as platform from '@/services/backend/platform';

export type Subscription = BackendAPI.SubscriptionWithPlanDto;
export type Tenant = BackendAPI.TenantListItemDto;
export const listTenants = (params: BackendAPI.listTenantsParams) =>
  platform.listTenants(params, { skipErrorHandler: true });
export const createTenant = (body: BackendAPI.CreateTenantDto) =>
  platform.createTenant(body, { skipErrorHandler: true });
export const updateTenant = (id: string, body: BackendAPI.UpdateTenantDto) =>
  platform.updateTenant({ id }, body, { skipErrorHandler: true });
export const assignPlan = (id: string, body: BackendAPI.AssignPlanDto) =>
  platform.assignPlan({ id }, body, { skipErrorHandler: true });
