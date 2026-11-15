import { request } from '@umijs/max';

export async function queryHello() {
  return request<{ success: boolean; data: { message: string } }>(
    '/api/hello',
    {
      method: 'GET',
      skipErrorHandler: true,
    },
  );
}
