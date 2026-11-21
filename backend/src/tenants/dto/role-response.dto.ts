import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class RoleDto {
  @ApiProperty({ maxLength: 100 }) name!: string;
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty({ type: String }) id!: string;
}
export class RoleListResponseDto extends SuccessDto {
  @ApiProperty({ type: [RoleDto] }) data!: RoleDto[];
}
export class PermissionDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() featureCode!: string;
  @ApiProperty() featureName!: string;
  @ApiProperty() featureDescription!: string;
  @ApiProperty({ enum: ['base', 'samples'] }) category!: string;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty() isDemo!: boolean;
  @ApiProperty({ enum: ['page', 'action'] }) kind!: string;
  @ApiProperty({ enum: ['read', 'create', 'update', 'delete', 'manage'] })
  group!: string;
  @ApiProperty({ enum: ['normal', 'destructive'] }) risk!: string;
  @ApiProperty() defaultMemberAccess!: boolean;
  @ApiProperty({ type: [String] }) requires!: string[];
}
export class PermissionListResponseDto extends SuccessDto {
  @ApiProperty({ type: [PermissionDto] }) data!: PermissionDto[];
}
