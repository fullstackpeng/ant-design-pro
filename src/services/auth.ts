import { request } from '@umijs/max';

export async function login(body: API.LoginParams) {
  return request<{ success: boolean; data: null }>('/api/login/account', {
    method: 'POST',
    data: body,
    skipErrorHandler: true,
  });
}

export async function currentUser() {
  return request<{ success: boolean; data: API.CurrentUser }>('/api/currentUser', {
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
