import type { ScheduledTask } from '../generated/prisma/client.js';
import type { TaskSnapshot } from './task.types.js';

export const taskSelect = {
  id: true,
  name: true,
  type: true,
  handler: true,
  cron: true,
  timezone: true,
  scope: true,
  tenantIds: true,
  params: true,
  enabled: true,
  timeoutMs: true,
  maxAttempts: true,
  concurrency: true,
  revision: true,
  syncedRevision: true,
  syncError: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const runSelect = {
  id: true,
  taskId: true,
  taskName: true,
  type: true,
  source: true,
  tenantId: true,
  retryOf: true,
  status: true,
  attemptsMade: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
  durationMs: true,
  error: true,
  result: true,
  snapshot: true,
  idempotencyKey: true,
  attempts: {
    select: {
      id: true,
      number: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      durationMs: true,
      error: true,
    },
    orderBy: { number: 'asc' as const },
  },
} as const;

export function taskSnapshot(task: ScheduledTask): TaskSnapshot {
  return {
    name: task.name,
    type: 'internal',
    handler: task.handler,
    scope: task.scope as TaskSnapshot['scope'],
    tenantIds: task.tenantIds,
    params: task.params as TaskSnapshot['params'],
    timeoutMs: task.timeoutMs,
    maxAttempts: task.maxAttempts,
    revision: task.revision,
  };
}

export function taskError(error: unknown) {
  return (error instanceof Error ? error.message : '任务执行失败').slice(
    0,
    2000,
  );
}
