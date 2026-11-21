export const taskScopes = ['global', 'selected', 'all'] as const;
export const runStatuses = [
  'queued',
  'running',
  'retrying',
  'succeeded',
  'failed',
  'timed_out',
  'skipped',
] as const;
export const terminalStatuses = ['succeeded', 'failed', 'timed_out', 'skipped'];
export const DISPATCH_QUEUE = 'platform-task-dispatch';
export const EXECUTION_QUEUE = 'platform-task-execution';
export const SCHEDULER_PREFIX = 'platform-task-';

export interface TaskSnapshot {
  name: string;
  type: 'internal';
  handler: string;
  scope: (typeof taskScopes)[number];
  tenantIds: string[];
  params: Record<string, unknown>;
  timeoutMs: number;
  maxAttempts: number;
  revision: number;
}

export interface TaskContext {
  runId: string;
  tenantId: bigint | null;
  idempotencyKey: string;
  signal: AbortSignal;
}

export interface Executor {
  execute(
    snapshot: TaskSnapshot,
    context: TaskContext,
  ): Promise<Record<string, unknown>>;
}
