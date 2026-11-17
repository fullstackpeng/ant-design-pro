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
  @ApiProperty() featureCode!: string;
}
export class PermissionListResponseDto extends SuccessDto {
  @ApiProperty({ type: [PermissionDto] }) data!: PermissionDto[];
}
