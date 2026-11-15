import { request } from '@umijs/max';

export interface LoginParams {
  tenantCode: string;
  username: string;
  password: string;
  autoLogin?: boolean;
  type?: 'account';
}

export interface CurrentUser {
  userid: string;
  name: string;
  avatar?: string;
  access: 'admin' | 'user';
  isPlatformAdmin: boolean;
  tenant: { id: string; code: string; name: string } | null;
}

export async function login(body: LoginParams) {
  return request<{ success: boolean; data: null }>('/api/login/account', {
    method: 'POST',
    data: body,
    skipErrorHandler: true,
  });
}

export async function currentUser() {
  return request<{ success: boolean; data: CurrentUser }>('/api/currentUser', {
    method: 'GET',
    skipErrorHandler: true,
  });
}

export async function outLogin() {
  return request<{ success: boolean; data: null }>('/api/login/outLogin', {
    method: 'POST',
    skipErrorHandler: true,
  });
}
