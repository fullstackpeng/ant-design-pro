import { request } from '@umijs/max';
import type { Subscription } from '../tenants/service';
import type { TableResult } from '../useManagement';

export interface Member {
  userId: string;
  role: 'admin' | 'user';
  isActive: boolean;
  user: { username: string; name: string };
}
export const listMembers = (params: Record<string, unknown>) =>
  request<TableResult<Member>>('/api/tenant/members', {
    params,
    skipErrorHandler: true,
  });
export const addMember = (data: unknown) =>
  request('/api/tenant/members', {
    method: 'POST',
    data,
    skipErrorHandler: true,
  });
export const updateMember = (id: string, data: unknown) =>
  request(`/api/tenant/members/${id}`, {
    method: 'PATCH',
    data,
    skipErrorHandler: true,
  });
export const removeMember = (id: string) =>
  request(`/api/tenant/members/${id}`, {
    method: 'DELETE',
    skipErrorHandler: true,
  });
export const subscriptionInfo = () =>
  request<{
    success: boolean;
    data: { subscription: Subscription | null; used: number };
  }>('/api/tenant/subscription', { skipErrorHandler: true });
