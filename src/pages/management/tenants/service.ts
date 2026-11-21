import * as platform from '@/services/backend/platform';
import type { DictionaryReference } from '@/services/dictionaries';

export const industryDictionary = {
  scope: 'platform',
  code: 'industry',
} as const satisfies DictionaryReference;

export type Subscription = BackendAPI.SubscriptionWithPlanDto;
export type Tenant = BackendAPI.TenantListItemDto;
export const listTenants = (params: BackendAPI.listTenantsParams) =>
  platform.listTenants(params, { skipErrorHandler: true });
export const createTenant = (body: BackendAPI.CreateTenantDto) =>
  platform.createTenant(
    { ...body, industry: body.industry ?? '' },
    { skipErrorHandler: true },
  );
export const updateTenant = (id: string, body: BackendAPI.UpdateTenantDto) =>
  platform.updateTenant(
    { id },
    { ...body, industry: body.industry ?? '' },
    { skipErrorHandler: true },
  );
export const assignPlan = (id: string, body: BackendAPI.AssignPlanDto) =>
  platform.assignPlan({ id }, body, { skipErrorHandler: true });
