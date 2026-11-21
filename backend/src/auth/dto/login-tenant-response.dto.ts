import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class LoginTenantDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class LoginTenantListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [LoginTenantDto] }) data!: LoginTenantDto[];
}
