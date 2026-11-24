import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsString,
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

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @Optional()
  @Validate(DatabaseIdConstraint)
  tenantId?: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  actorName?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(64)
  module?: string;
  @ApiPropertyOptional({ maxLength: 120 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(120)
  eventCode?: string;
  @ApiPropertyOptional({ enum: ['succeeded', 'failed', 'denied', 'accepted'] })
  @Optional()
  @IsIn(['succeeded', 'failed', 'denied', 'accepted'])
  result?: string;
  @ApiPropertyOptional()
  @Optional()
  @IsISO8601({ strict: true })
  startAt?: string;
  @ApiPropertyOptional()
  @Optional()
  @IsISO8601({ strict: true })
  endAt?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(64)
  ip?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(64)
  attemptedAccount?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(64)
  attemptedTenant?: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  requestId?: string;
}
export class UpdateAuditPolicyDto {
  @ApiProperty({ minimum: 1, maximum: 3650 })
  @IsInt()
  @Min(1)
  @Max(3650)
  operationDays!: number;
  @ApiProperty({ minimum: 1, maximum: 3650 })
  @IsInt()
  @Min(1)
  @Max(3650)
  loginDays!: number;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
}
