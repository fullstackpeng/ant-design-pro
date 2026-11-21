import { Inject, Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { QueueService } from './queue.service.js';
import {
  QUEUE_PROBE,
  type QueueProbeData,
  type QueueProbeResult,
} from './queue-probe.js';

@Injectable()
export class QueueProbeWorker {
  constructor(@Inject(QueueService) private readonly queues: QueueService) {}

  create() {
    return this.queues.createWorker<QueueProbeData, QueueProbeResult>(
      QUEUE_PROBE,
      async (job) => {
        if (job.name !== 'ping') throw new UnrecoverableError('Unknown probe.');
        return { processedAt: new Date().toISOString() };
      },
    );
  }
}
