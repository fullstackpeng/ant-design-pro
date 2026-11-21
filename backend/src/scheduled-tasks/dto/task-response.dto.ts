import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';
import { runStatuses, taskScopes } from '../task.types.js';

export class ScheduledTaskDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['internal'] }) type!: string;
  @ApiProperty() handler!: string;
  @ApiProperty() cron!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty({ enum: taskScopes }) scope!: string;
  @ApiProperty({ type: [String] }) tenantIds!: string[];
  @ApiProperty({ type: 'object', additionalProperties: true }) params!: object;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: 'integer' }) timeoutMs!: number;
  @ApiProperty({ type: 'integer' }) maxAttempts!: number;
  @ApiProperty({ type: 'integer' }) concurrency!: number;
  @ApiProperty({ type: 'integer' }) revision!: number;
  @ApiProperty({ type: 'integer' }) syncedRevision!: number;
  @ApiProperty() syncError!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class TaskListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [ScheduledTaskDto] }) data!: ScheduledTaskDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
export class TaskResponseDto extends SuccessDto {
  @ApiProperty({ type: () => ScheduledTaskDto }) data!: ScheduledTaskDto;
}
export class TaskAttemptDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: 'integer' }) number!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startedAt!: string;
  @ApiProperty({ type: String, nullable: true }) finishedAt!: string | null;
  @ApiProperty({ type: 'integer', nullable: true }) durationMs!: number | null;
  @ApiProperty() error!: string;
}
export class TaskRunDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String }) taskId!: string;
  @ApiProperty() taskName!: string;
  @ApiProperty() type!: string;
  @ApiProperty() source!: string;
  @ApiProperty({ type: String, nullable: true }) tenantId!: string | null;
  @ApiProperty({ type: String, nullable: true }) retryOf!: string | null;
  @ApiProperty({ enum: runStatuses }) status!: string;
  @ApiProperty({ type: 'integer' }) attemptsMade!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true }) startedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) finishedAt!: string | null;
  @ApiProperty({ type: 'integer', nullable: true }) durationMs!: number | null;
  @ApiProperty() error!: string;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  result!: object | null;
  @ApiProperty({ type: 'object', additionalProperties: true })
  snapshot!: object;
  @ApiProperty() idempotencyKey!: string;
  @ApiProperty({ type: () => [TaskAttemptDto] }) attempts!: TaskAttemptDto[];
}
export class RunListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [TaskRunDto] }) data!: TaskRunDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
export class RunResponseDto extends SuccessDto {
  @ApiProperty({ type: () => TaskRunDto }) data!: TaskRunDto;
}
export class DispatchResponseDto extends SuccessDto {
  @ApiProperty() data!: string;
}
export class TaskHandlerDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String] }) scopes!: string[];
  @ApiProperty({ type: String, nullable: true }) feature!: string | null;
}
export class HandlerListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [TaskHandlerDto] }) data!: TaskHandlerDto[];
}
