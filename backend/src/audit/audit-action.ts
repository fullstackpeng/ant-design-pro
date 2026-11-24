import { randomUUID } from 'node:crypto';
import { HttpException, Logger, SetMetadata } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { auditClient } from './audit-client.js';
import { type AuditContext, auditContext } from './audit-context.js';

export const AUDIT_ENDPOINT = 'audit:endpoint';
export const auditActions = new Map<string, AuditActionOptions>();
export interface AuditActionOptions {
  event: string;
  name: string;
  mode?: 'database' | 'external';
  kind?: 'login';
  targetArg?: number;
  entity?: string;
  successResult?: 'succeeded' | 'accepted';
}
export type AuditEndpointOptions =
  | { event: string; name: string; kind?: 'login' }
  | { exempt: string };
export const AuditEndpoint = (options: AuditEndpointOptions) =>
  SetMetadata(AUDIT_ENDPOINT, options);

export function errorSummary(error: unknown): string {
  // Never persist exception messages: upstream errors may contain secrets or URLs.
  const status = error instanceof HttpException ? error.getStatus() : 500;
  return status === 401
    ? '认证失败或会话失效'
    : status === 403
      ? '权限不足'
      : status === 400
        ? '请求参数或业务条件不满足'
        : status === 404
          ? '目标不存在'
          : status === 409
            ? '数据冲突或业务条件不满足'
            : '操作执行失败';
}

export async function writeAudit(
  client: Prisma.TransactionClient,
  options: AuditActionOptions,
  context: AuditContext,
  result: string,
  message = '',
  targetId = '',
) {
  const session = context.session;
  const tenant =
    session?.tenant ??
    context.tenantContext ??
    (options.kind === 'login' ? context.attemptedTenantContext : undefined);
  const changes = context.action?.changes ?? [];
  const first =
    (options.entity
      ? (changes.find(
          (change) =>
            change.entity === options.entity &&
            (change.after.id ||
              change.before.id ||
              change.after.code ||
              change.before.code ||
              change.after.userId ||
              change.before.userId),
        ) ?? changes.find((change) => change.entity === options.entity))
      : undefined) ??
    changes.find(
      (change) =>
        change.after.id ||
        change.before.id ||
        change.after.code ||
        change.before.code,
    );
  const snapshot = { ...first?.before, ...first?.after };
  const targetTenant =
    options.entity === 'tenant' ? snapshot.id : snapshot.tenantId;
  const eventId = randomUUID();
  const data = {
    eventId,
    eventCode: options.event,
    module: options.event.split('.')[0],
    action: options.name,
    scope: tenant
      ? 'tenant'
      : session?.isPlatformAdmin || context.attemptedTenant === 'platform'
        ? 'platform'
        : 'system',
    tenantId: tenant ? BigInt(tenant.id) : null,
    tenantCode: tenant?.code ?? '',
    tenantName: tenant?.name ?? '',
    actorId: session ? BigInt(session.userid) : null,
    actorName: (
      session?.name ??
      (options.kind === 'login' || context.endpoint ? '' : '系统')
    ).slice(0, 100),
    targetType: first?.entity ?? options.entity ?? '',
    targetId: String(
      snapshot.id ?? snapshot.code ?? snapshot.userId ?? targetId,
    ).slice(0, 100),
    targetName: String(
      snapshot.name ?? snapshot.title ?? snapshot.originalName ?? '',
    ).slice(0, 200),
    targetTenantId:
      targetTenant && /^\d+$/.test(String(targetTenant))
        ? BigInt(String(targetTenant))
        : null,
    result,
    message,
    requestId: context.requestId,
    ip: context.ip.slice(0, 64),
    userAgent: context.userAgent.slice(0, 500),
    changes: changes.map((change, index) => ({
      ...change,
      changeId: `${eventId}-${index}`,
    })) as unknown as Prisma.InputJsonValue,
  };
  if (options.kind === 'login') {
    await client.loginLog.create({
      data: {
        ...data,
        attemptedAccount: context.attemptedAccount ?? '',
        attemptedTenant: context.attemptedTenant ?? '',
      },
    });
  } else await client.operationLog.create({ data });
}

/** Own the business event in the service; a database action and its log commit together. */
export function AuditAction(options: AuditActionOptions): MethodDecorator {
  if (auditActions.has(options.event))
    throw new Error(`Duplicate audit event: ${options.event}`);
  auditActions.set(options.event, options);
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (
      this: { prisma: PrismaService },
      ...args: unknown[]
    ) {
      const inherited = auditContext.getStore();
      // Nested service calls belong to the enclosing business event.
      if (inherited?.action && !inherited.action.closed)
        return original.apply(this, args);
      const context: AuditContext = {
        ...inherited,
        transaction: undefined,
        outcome: undefined,
        requestId: inherited?.requestId ?? randomUUID(),
        ip: inherited?.ip ?? '',
        userAgent: inherited?.userAgent ?? '',
        action: {
          changes: [],
          ...(options.mode === 'external' ? { external: options } : {}),
        },
      };
      const targetId =
        options.targetArg === undefined
          ? ''
          : String(args[options.targetArg] ?? '').slice(0, 100);
      const initialAction = context.action;
      try {
        const run = async () => {
          const value = await original.apply(this, args);
          await writeAudit(
            this.prisma,
            options,
            context,
            context.outcome?.result ?? options.successResult ?? 'succeeded',
            context.outcome?.message ?? '',
            targetId,
          );
          return value;
        };
        const value = await auditContext.run(context, async () => {
          if (options.mode === 'external') return run();
          // Retry the entire database action; reset snapshots on each attempt.
          for (let attempt = 0; ; attempt++) {
            context.action = { changes: [] };
            try {
              return await this.prisma.$transaction(
                async (tx) => {
                  context.transaction = auditClient(tx);
                  try {
                    return await run();
                  } finally {
                    context.transaction = undefined;
                  }
                },
                { isolationLevel: 'Serializable', timeout: 15000 },
              );
            } catch (error) {
              const code = (
                error as { code?: string; cause?: { originalCode?: string } }
              ).code;
              const originalCode = (
                error as { cause?: { originalCode?: string } }
              ).cause?.originalCode;
              if (
                attempt >= 2 ||
                (code !== 'P2034' &&
                  originalCode !== '40001' &&
                  originalCode !== '40P01')
              )
                throw error;
            }
          }
        });
        if (inherited) {
          inherited.recorded = true;
          if (context.session) inherited.session = context.session;
        }
        return value;
      } catch (error) {
        context.action = { changes: [] };
        await writeAudit(
          this.prisma,
          options,
          context,
          error instanceof HttpException && error.getStatus() === 403
            ? 'denied'
            : 'failed',
          errorSummary(error),
          targetId,
        ).catch(() =>
          new Logger('Audit').error(
            `Audit persistence failed: ${context.requestId}`,
          ),
        );
        if (inherited) {
          inherited.recorded = true;
          inherited.failureRecorded = true;
        }
        throw error;
      } finally {
        if (initialAction) initialAction.closed = true;
        if (context.action) context.action.closed = true;
      }
    };
    // Keep service metadata available for coverage inspection.
    Reflect.defineMetadata(AUDIT_ENDPOINT, options, descriptor.value);
  };
}
