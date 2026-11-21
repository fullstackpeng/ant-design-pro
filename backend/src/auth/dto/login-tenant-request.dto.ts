import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { Optional, Trim } from '../../common/dto/request.dto.js';

export class LoginTenantQueryDto {
  @ApiPropertyOptional({
    description: '租户名称或编码，支持包含匹配',
    maxLength: 100,
  })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({
    type: 'integer',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
