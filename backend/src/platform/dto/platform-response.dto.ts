import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class PlanDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: 'integer' }) maxMembers!: number;
  @ApiProperty({ type: 'integer', description: '存储空间上限（MB）' })
  maxStorageMb!: number;
  @ApiProperty({ type: 'integer', description: '单文件大小上限（MB）' })
  maxFileSizeMb!: number;
  @ApiProperty() isActive!: boolean;
}

export class SubscriptionDto {
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiProperty({ type: String }) planId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
  @ApiProperty() isActive!: boolean;
}

export class SubscriptionWithPlanDto extends SubscriptionDto {
  @ApiProperty({ type: () => PlanDto }) plan!: PlanDto;
}

export class TenantDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: '平台 industry 字典值，空字符串表示未填写' })
  industry!: string;
}

export class MembershipCountDto {
  @ApiProperty({ type: 'integer' }) memberships!: number;
}

export class TenantListItemDto extends TenantDto {
  @ApiProperty({ type: () => SubscriptionWithPlanDto, nullable: true })
  subscription!: SubscriptionWithPlanDto | null;
  @ApiProperty({ type: () => MembershipCountDto }) _count!: MembershipCountDto;
}

export class PlanResponseDto extends SuccessDto {
  @ApiProperty({ type: () => PlanDto }) data!: PlanDto;
}
export class PlanListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [PlanDto] }) data!: PlanDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
export class TenantResponseDto extends SuccessDto {
  @ApiProperty({ type: () => TenantDto }) data!: TenantDto;
}
export class TenantListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [TenantListItemDto] }) data!: TenantListItemDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
export class SubscriptionResponseDto extends SuccessDto {
  @ApiProperty({ type: () => SubscriptionDto }) data!: SubscriptionDto;
}
