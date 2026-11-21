import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import {
  DatabaseIdConstraint,
  Optional,
  PaginationQueryDto,
  Trim,
} from '../../common/dto/request.dto.js';
import { runStatuses, taskScopes } from '../task.types.js';

export class TaskQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  name?: string;
  @ApiPropertyOptional({ enum: ['internal'] })
  @Optional()
  @IsIn(['internal'])
  type?: string;
}
export class RunQueryDto extends TaskQueryDto {
  @ApiPropertyOptional({ enum: runStatuses })
  @Optional()
  @IsIn(runStatuses)
  status?: string;
  @ApiPropertyOptional({ type: String })
  @Optional()
  @Validate(DatabaseIdConstraint)
  taskId?: string;
}
export class TaskConfigDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @ApiProperty({ enum: ['internal'] }) @IsIn(['internal']) type!: 'internal';
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  handler!: string;
  @ApiProperty({ example: '0 * * * *', maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cron!: string;
  @ApiProperty({ example: 'Asia/Taipei', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone!: string;
  @ApiProperty({ enum: taskScopes })
  @IsIn(taskScopes)
  scope!: (typeof taskScopes)[number];
  @ApiProperty({ type: [String], maxItems: 100 })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Validate(DatabaseIdConstraint, { each: true })
  tenantIds!: string[];
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  params!: Record<string, unknown>;
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty({ type: 'integer', minimum: 100, maximum: 300000 })
  @IsInt()
  @Min(100)
  @Max(300000)
  timeoutMs!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  maxAttempts!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  concurrency!: number;
}
export class CreateTaskDto extends TaskConfigDto {}
export class RevisionDto {
  @ApiProperty({ type: 'integer', minimum: 1 })
  @IsInt()
  @Min(1)
  revision!: number;
}
export class UpdateTaskDto extends TaskConfigDto {
  @ApiProperty({ type: 'integer', minimum: 1 })
  @IsInt()
  @Min(1)
  revision!: number;
}
export class TaskEnabledDto extends RevisionDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
}
export class RunIdDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id!: string;
}
