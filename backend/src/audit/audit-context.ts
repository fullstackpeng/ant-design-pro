import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionContext } from '../auth/session-context.js';
import type { Prisma } from '../generated/prisma/client.js';

export interface AuditChange {
  entity: string;
  operation: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}
export interface AuditContext {
  requestId: string;
  ip: string;
  userAgent: string;
  session?: SessionContext;
  attemptedAccount?: string;
  attemptedTenant?: string;
  attemptedTenantContext?: { id: string; code: string; name: string };
  tenantContext?: { id: string; code: string; name: string };
  endpoint?: { event: string; name: string; kind?: 'login' };
  recorded?: boolean;
  failureRecorded?: boolean;
  outcome?: { result: 'failed' | 'accepted' | 'succeeded'; message: string };
  action?: {
    changes: AuditChange[];
    closed?: boolean;
    external?: { event: string; name: string; kind?: 'login' };
  };
  transaction?: Prisma.TransactionClient;
}
export const auditContext = new AsyncLocalStorage<AuditContext>();

// Only named, non-secret business fields are eligible. Arbitrary nested payloads
// and configuration objects are deliberately excluded.
const fields = new Set([
  'id',
  'code',
  'name',
  'username',
  'title',
  'isActive',
  'isPlatformAdmin',
  'tenantId',
  'userId',
  'roleId',
  'departmentId',
  'positionId',
  'planId',
  'featureCode',
  'permissions',
  'role',
  'sortOrder',
  'parentId',
  'parentCode',
  'kind',
  'path',
  'icon',
  'minRole',
  'label',
  'value',
  'color',
  'revision',
  'isDefault',
  'protocol',
  'protocolVersion',
  'port',
  'useTls',
  'maxMembers',
  'maxStorageMb',
  'maxFileSizeMb',
  'startsAt',
  'expiresAt',
  'originalName',
  'mimeType',
  'size',
  'visibility',
  'providerId',
  'source',
  'type',
  'publishAt',
  'expireAt',
  'notificationId',
  'readAt',
  'enabled',
  'deletedAt',
  'cron',
  'timezone',
  'handler',
  'scope',
  'tenantIds',
  'timeoutMs',
  'maxAttempts',
  'concurrency',
  'taskId',
  'runId',
  'status',
  'operationDays',
  'loginDays',
  'conversationRetentionDays',
  'publicationScope',
  'permissionMode',
  'isPublic',
  'knowledgeBaseId',
  'assistantId',
  'documentId',
  'permissionCode',
  'contentVersion',
  'version',
  'exact',
  'keyword',
  'trigram',
  'vector',
  'topK',
  'defaultLocale',
  'colorPrimary',
  'footerText',
]);
export function auditSnapshot(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!fields.has(key)) continue;
    if (item === null || typeof item === 'boolean' || typeof item === 'number')
      result[key] = item;
    else if (typeof item === 'bigint') result[key] = item.toString();
    else if (typeof item === 'string') result[key] = item.slice(0, 500);
    else if (item instanceof Date) result[key] = item.toISOString();
    else if (Array.isArray(item))
      result[key] = item
        .slice(0, 100)
        .filter((entry) => typeof entry === 'string')
        .map((entry: string) => entry.slice(0, 100));
  }
  return result;
}

export function recordAuditTarget(entity: string, value: unknown) {
  const action = auditContext.getStore()?.action;
  if (action && !action.closed && action.changes.length < 50)
    action.changes.push({
      entity,
      operation: 'read',
      before: auditSnapshot(value),
      after: {},
    });
}
