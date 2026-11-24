import dayjs from 'dayjs';
import * as audit from '@/services/backend/audit';

export type AuditScope = 'platform' | 'tenant';
export type AuditKind = 'operation' | 'login';
export type AuditLog = BackendAPI.AuditLogDto;
export type AuditPolicy = BackendAPI.AuditPolicyDto;
type Query = BackendAPI.listPlatformOperationLogsParams;
const options = { skipErrorHandler: true };

export function listAuditLogs(
  scope: AuditScope,
  kind: AuditKind,
  params: Query,
) {
  const query: Query = {
    ...params,
    ...(params.startAt ? { startAt: dayjs(params.startAt).toISOString() } : {}),
    ...(params.endAt ? { endAt: dayjs(params.endAt).toISOString() } : {}),
  };
  const list =
    scope === 'platform'
      ? kind === 'operation'
        ? audit.listPlatformOperationLogs
        : audit.listPlatformLoginLogs
      : kind === 'operation'
        ? audit.listTenantOperationLogs
        : audit.listTenantLoginLogs;
  return list(query, options);
}
export function getAuditLog(scope: AuditScope, kind: AuditKind, id: string) {
  const get =
    scope === 'platform'
      ? kind === 'operation'
        ? audit.getPlatformOperationLog
        : audit.getPlatformLoginLog
      : kind === 'operation'
        ? audit.getTenantOperationLog
        : audit.getTenantLoginLog;
  return get({ id }, options);
}
export const getAuditPolicy = (scope: AuditScope) =>
  scope === 'platform'
    ? audit.getPlatformAuditPolicy(options)
    : audit.getTenantAuditPolicy(options);
export const updateAuditPolicy = (body: BackendAPI.UpdateAuditPolicyDto) =>
  audit.updateAuditPolicy(body, options);
