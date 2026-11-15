import { request } from '@umijs/max';
import type { Plan } from '../plans/service';
import type { TableResult } from '../useManagement';

export interface Subscription {
  planId: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  plan: Plan;
}
export interface Tenant {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  subscription: Subscription | null;
  _count: { memberships: number };
}
export const listTenants = (params: Record<string, unknown>) =>
  request<TableResult<Tenant>>('/api/platform/tenants', {
    params,
    skipErrorHandler: true,
  });
export const saveTenant = (data: unknown, id?: string) =>
  request(`/api/platform/tenants${id ? `/${id}` : ''}`, {
    method: id ? 'PATCH' : 'POST',
    data,
    skipErrorHandler: true,
  });
export const assignPlan = (id: string, data: unknown) =>
  request(`/api/platform/tenants/${id}/subscription`, {
    method: 'POST',
    data,
    skipErrorHandler: true,
  });
