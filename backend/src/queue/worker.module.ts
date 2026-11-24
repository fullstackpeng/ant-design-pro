import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ScheduledTasksModule } from '../scheduled-tasks/scheduled-tasks.module.js';
import { TaskRuntimeService } from '../scheduled-tasks/task-runtime.service.js';
import { QueueModule } from './queue.module.js';
import { QueueProbeWorker } from './queue-probe.worker.js';

@Module({
  imports: [QueueModule, DatabaseModule, ScheduledTasksModule, AuditModule],
  providers: [QueueProbeWorker, TaskRuntimeService],
})
export class WorkerModule {}
