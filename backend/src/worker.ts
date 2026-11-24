import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AiRetentionCleanupService } from './ai/conversation/retention-cleanup.service.js';
import { AuditCleanupService } from './audit/audit-cleanup.service.js';
import { QueueProbeWorker } from './queue/queue-probe.worker.js';
import { WorkerModule } from './queue/worker.module.js';
import { TaskRuntimeService } from './scheduled-tasks/task-runtime.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    abortOnError: false,
  });
  app.enableShutdownHooks();
  try {
    const worker = app.get(QueueProbeWorker).create();
    await worker.waitUntilReady();
    void worker.run().catch(async (error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
      await app.close();
    });
    await app.get(TaskRuntimeService).start((error) => {
      console.error(error.message);
      process.exitCode = 1;
      void app.close();
    });
    app.get(AuditCleanupService).start();
    app.get(AiRetentionCleanupService).start();
  } catch (error) {
    await app.close();
    throw error;
  }
}

void bootstrap().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
