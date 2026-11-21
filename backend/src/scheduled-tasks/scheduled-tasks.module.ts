import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { InternalExecutor } from './executors/internal.executor.js';
import { ScheduledTasksController } from './scheduled-tasks.controller.js';
import { ScheduledTasksService } from './scheduled-tasks.service.js';
import { TaskDispatchService } from './task-dispatch.service.js';
import { TaskExecutionService } from './task-execution.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ScheduledTasksController],
  providers: [
    ScheduledTasksService,
    InternalExecutor,
    TaskDispatchService,
    TaskExecutionService,
  ],
  exports: [InternalExecutor, TaskDispatchService, TaskExecutionService],
})
export class ScheduledTasksModule {}
