import type { Request } from 'express';

export interface SessionContext {
  userid: string;
  name: string;
  access: 'admin' | 'user';
  isPlatformAdmin: boolean;
  tenant: { id: string; code: string; name: string } | null;
}

export interface SessionRequest extends Request {
  sessionContext?: SessionContext;
}

export const SESSION_COOKIE = 'antd_session';

export function sessionToken(request: Request): string | undefined {
  const token: unknown = request.cookies?.[SESSION_COOKIE];
  return typeof token === 'string' ? token : undefined;
}
