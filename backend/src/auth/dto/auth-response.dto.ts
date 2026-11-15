import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';
import type { SessionContext } from '../session-context.js';

export class TenantIdentityDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class CurrentUserDto implements SessionContext {
  @ApiProperty({ type: String }) userid!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() avatar?: string;
  @ApiProperty({ enum: ['admin', 'user'] }) access!: 'admin' | 'user';
  @ApiProperty() isPlatformAdmin!: boolean;
  @ApiProperty({
    type: () => TenantIdentityDto,
    nullable: true,
    description: '平台会话为 null',
  })
  tenant!: TenantIdentityDto | null;
}

export class CurrentUserResponseDto extends SuccessDto {
  @ApiProperty({ type: () => CurrentUserDto }) data!: CurrentUserDto;
}

export class HelloDto {
  @ApiProperty({ example: 'Hello World!' }) message!: string;
}

export class HelloResponseDto extends SuccessDto {
  @ApiProperty({ type: () => HelloDto }) data!: HelloDto;
}
