import { setTimeout } from 'node:timers/promises';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  createPostgresBackend,
  type PostgresConnectionOptions,
  type Processor,
  type WorkerOptions,
  withBackend,
} from 'bullmq';
import { queueConfig } from './queue.config.js';

// Bind every constructor explicitly; never fall back to BullMQ's Redis default.
const { Queue, Worker, QueueEvents } = withBackend(createPostgresBackend);
type Resource = { close(): Promise<void> };
type CompletionQueue<Result> = {
  getJob(id: string): Promise<
    | {
        getState(): Promise<string>;
        finishedOn?: number;
        returnvalue: Result;
        failedReason: string;
      }
    | undefined
  >;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly workers = new Set<Resource>();
  private readonly resources = new Set<Resource>();
  private closing?: Promise<void>;
  private config?: ReturnType<typeof queueConfig>;

  // Construction stays offline, including OpenAPI generation and API-only boot.
  private settings() {
    if (this.closing) throw new Error('QueueService is shutting down.');
    this.config ??= queueConfig();
    return this.config;
  }

  createQueue<Data, Result = unknown>(name: string) {
    const queue = new Queue<Data, Result>(name, {
      connection: this.settings().connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      },
    });
    queue.on('error', (error) => this.logger.error(error.message));
    this.resources.add(queue);
    return queue;
  }

  createWorker<Data, Result = unknown>(
    name: string,
    processor: Processor<Data, Result>,
    options: Pick<WorkerOptions<PostgresConnectionOptions>, 'concurrency'> = {},
  ) {
    const config = this.settings();
    const worker = new Worker<Data, Result>(name, processor, {
      connection: config.connection,
      concurrency: options.concurrency ?? config.concurrency,
      autorun: false,
    });
    worker.on('error', (error) => this.logger.error(error.message));
    worker.on('failed', (job, error) =>
      this.logger.warn(`Queue ${name}, job ${job?.id}: ${error.message}`),
    );
    worker.on('stalled', (id) =>
      this.logger.warn(
        `Queue ${name}, job ${id} stalled; recovery may retry it.`,
      ),
    );
    this.workers.add(worker);
    return worker;
  }

  createEvents<Result = unknown>(name: string) {
    const events = new QueueEvents<Result>(name, {
      connection: this.settings().connection,
    });
    events.on('error', (error) => this.logger.error(error.message));
    this.resources.add(events);
    return events;
  }

  // Completion events can be missed under concurrent PostgreSQL processing.
  // Persisted terminal state is authoritative for bounded diagnostic waits.
  async waitForResult<Result>(
    queue: CompletionQueue<Result>,
    id: string,
    timeoutMs = 15000,
  ): Promise<Result> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      throw new Error('Queue result timeout must be a positive finite number.');
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.closing) throw new Error('QueueService is shutting down.');
      const job = await queue.getJob(id);
      if (!job) throw new Error(`Queue job ${id} no longer exists.`);
      if (job.finishedOn !== undefined) {
        const state = await job.getState();
        if (state === 'completed') return job.returnvalue;
        if (state === 'failed') throw new Error(job.failedReason);
      }
      await setTimeout(Math.min(100, Math.max(1, deadline - Date.now())));
    }
    throw new Error(
      `Timed out waiting for queue job ${id}; execution may continue.`,
    );
  }

  onModuleDestroy(): Promise<void> {
    this.closing ??= this.closeResources();
    return this.closing;
  }

  private async closeResources() {
    // Drain active work while its queues/events are still available.
    const workers = await Promise.allSettled(
      [...this.workers].map((worker) => worker.close()),
    );
    const resources = await Promise.allSettled(
      [...this.resources].map((resource) => resource.close()),
    );
    this.workers.clear();
    this.resources.clear();
    const errors = [...workers, ...resources].flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );
    if (errors.length)
      throw new AggregateError(errors, 'Queue shutdown failed.');
  }
}
