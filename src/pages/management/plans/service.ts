import { request } from '@umijs/max';
import type { TableResult } from '../useManagement';

export interface Plan {
  id: string;
  code: string;
  name: string;
  maxMembers: number;
  isActive: boolean;
}
export const listPlans = (params: Record<string, unknown> = {}) =>
  request<TableResult<Plan>>('/api/platform/plans', {
    params,
    skipErrorHandler: true,
  });
export const savePlan = (body: unknown, id?: string) =>
  request(`/api/platform/plans${id ? `/${id}` : ''}`, {
    method: id ? 'PATCH' : 'POST',
    data: body,
    skipErrorHandler: true,
  });
