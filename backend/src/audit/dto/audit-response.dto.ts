import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class AuditLogDto {
  @ApiProperty() id!: string;
  @ApiProperty() eventId!: string;
  @ApiProperty() eventCode!: string;
  @ApiProperty() module!: string;
  @ApiProperty() action!: string;
  @ApiProperty() scope!: string;
  @ApiProperty({ type: String, nullable: true }) tenantId!: string | null;
  @ApiProperty() tenantCode!: string;
  @ApiProperty() tenantName!: string;
  @ApiProperty({ type: String, nullable: true }) actorId!: string | null;
  @ApiProperty() actorName!: string;
  @ApiProperty({ type: String, nullable: true }) targetTenantId!: string | null;
  @ApiProperty() targetType!: string;
  @ApiProperty() targetId!: string;
  @ApiProperty() targetName!: string;
  @ApiProperty() result!: string;
  @ApiProperty() message!: string;
  @ApiProperty() requestId!: string;
  @ApiProperty() ip!: string;
  @ApiProperty() userAgent!: string;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  changes!: Record<string, unknown>[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional() attemptedAccount?: string;
  @ApiPropertyOptional() attemptedTenant?: string;
}
export class AuditLogListResponseDto extends SuccessDto {
  @ApiProperty({ type: [AuditLogDto] }) data!: AuditLogDto[];
  @ApiProperty() total!: number;
}
export class AuditLogResponseDto extends SuccessDto {
  @ApiProperty({ type: AuditLogDto }) data!: AuditLogDto;
}
export class AuditPolicyDto {
  @ApiProperty() operationDays!: number;
  @ApiProperty() loginDays!: number;
  @ApiProperty() revision!: number;
}
export class AuditPolicyResponseDto extends SuccessDto {
  @ApiProperty({ type: AuditPolicyDto }) data!: AuditPolicyDto;
}
