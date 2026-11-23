import { ApiProperty } from '@nestjs/swagger';
import { TenantIdentityDto } from '../../auth/dto/auth-response.dto.js';
import { SuccessDto } from '../../common/dto/response.dto.js';
import { SubscriptionWithPlanDto } from '../../platform/dto/platform-response.dto.js';
import { DepartmentDto } from './department-response.dto.js';
import { PositionDto } from './position-response.dto.js';
import { RoleDto } from './role-response.dto.js';

export class MemberUserDto {
  @ApiProperty() username!: string;
  @ApiProperty() name!: string;
}
export class MemberDto {
  @ApiProperty({ type: () => DepartmentDto, nullable: true })
  department!: DepartmentDto | null;
  @ApiProperty({ type: [PositionDto] }) positions!: PositionDto[];
  @ApiProperty({ type: [RoleDto] }) roles!: RoleDto[];
  @ApiProperty({ type: String }) userId!: string;
  @ApiProperty({ enum: ['admin', 'user'] }) role!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: () => MemberUserDto }) user!: MemberUserDto;
}
export class MemberListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [MemberDto] }) data!: MemberDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
export class SubscriptionUsageDto {
  @ApiProperty({ type: () => SubscriptionWithPlanDto, nullable: true })
  subscription!: SubscriptionWithPlanDto | null;
  @ApiProperty({ type: 'integer' }) used!: number;
}
export class SubscriptionUsageResponseDto extends SuccessDto {
  @ApiProperty({ type: () => SubscriptionUsageDto })
  data!: SubscriptionUsageDto;
}
export class CurrentTenantDto extends TenantIdentityDto {
  @ApiProperty({ enum: ['admin', 'user'] }) role!: 'admin' | 'user';
}
export class CurrentTenantResponseDto extends SuccessDto {
  @ApiProperty({ type: () => CurrentTenantDto }) data!: CurrentTenantDto;
}

export class MemberOrganizationOptionsDto {
  @ApiProperty({ type: [DepartmentDto] }) departments!: DepartmentDto[];
  @ApiProperty({ type: [PositionDto] }) positions!: PositionDto[];
}
export class MemberOrganizationOptionsResponseDto extends SuccessDto {
  @ApiProperty({ type: MemberOrganizationOptionsDto })
  data!: MemberOrganizationOptionsDto;
}
