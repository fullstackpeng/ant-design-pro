import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class AccountDepartmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() path!: string;
  @ApiProperty() isActive!: boolean;
}
export class AccountPositionDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
}
export class AccountRoleDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}
export class AccountMembershipDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['admin', 'user'] }) role!: string;
  @ApiProperty({ type: AccountDepartmentDto, nullable: true })
  department!: AccountDepartmentDto | null;
  @ApiProperty({ type: [AccountPositionDto] }) positions!: AccountPositionDto[];
  @ApiProperty({ type: [AccountRoleDto] }) roles!: AccountRoleDto[];
}
export class AccountProfileDto {
  @ApiProperty() userId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) avatar!: string | null;
  @ApiProperty() isPlatformAdmin!: boolean;
  @ApiProperty({ type: AccountMembershipDto, nullable: true })
  tenant!: AccountMembershipDto | null;
}
export class AccountProfileResponseDto extends SuccessDto {
  @ApiProperty({ type: AccountProfileDto }) data!: AccountProfileDto;
}
export class AccountAvatarDto {
  @ApiProperty() url!: string;
}
export class AccountAvatarResponseDto extends SuccessDto {
  @ApiProperty({ type: AccountAvatarDto }) data!: AccountAvatarDto;
}
