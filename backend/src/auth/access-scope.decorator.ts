import { SetMetadata } from '@nestjs/common';

export type AccessScope =
  | 'authenticated'
  | 'tenant'
  | 'tenant-admin'
  | 'platform';
export const ACCESS_SCOPE = 'accessScope';
export const RequireScope = (scope: AccessScope) =>
  SetMetadata(ACCESS_SCOPE, scope);
