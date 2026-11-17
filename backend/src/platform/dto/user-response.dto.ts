import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class UserMembershipDto {
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiProperty() tenantName!: string;
  @ApiProperty() role!: string;
  @ApiProperty() isActive!: boolean;
}
export class PlatformUserDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isPlatformAdmin!: boolean;
  @ApiProperty({ type: [UserMembershipDto] }) memberships!: UserMembershipDto[];
}
export class UserListResponseDto extends SuccessDto {
  @ApiProperty({ type: [PlatformUserDto] }) data!: PlatformUserDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
