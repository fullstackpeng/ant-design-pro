import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { QueueModule } from './queue.module.js';
import { QueueService } from './queue.service.js';
import {
  QUEUE_PROBE,
  type QueueProbeData,
  type QueueProbeResult,
} from './queue-probe.js';

async function probe() {
  const app = await NestFactory.createApplicationContext(QueueModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const queues = app.get(QueueService);
    const queue = queues.createQueue<QueueProbeData, QueueProbeResult>(
      QUEUE_PROBE,
    );
    const job = await queue.add('ping', {
      requestedAt: new Date().toISOString(),
    });
    if (!job.id) throw new Error('Probe job ID is missing.');
    const result = await queues.waitForResult(queue, job.id);
    console.log(`BullMQ PostgreSQL probe completed: ${result.processedAt}`);
  } finally {
    await app.close();
  }
}

void probe().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
