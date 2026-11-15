import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Optional, Trim } from '../../common/dto/request.dto.js';

export class LoginDto {
  @ApiProperty({
    example: 'tenant-a',
    description: '租户编码；平台管理员填写 platform',
    pattern: '^[a-z0-9][a-z0-9-]{0,63}$',
    maxLength: 64,
  })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/)
  tenantCode!: string;

  @ApiProperty({ example: 'admin', maxLength: 64 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @ApiProperty({
    format: 'password',
    writeOnly: true,
    minLength: 1,
    maxLength: 1024,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;

  @ApiPropertyOptional({
    description: '勾选后保存 7 天，否则使用浏览器会话 Cookie',
  })
  @Optional()
  @IsBoolean()
  autoLogin?: boolean;

  @ApiPropertyOptional({ enum: ['account'] })
  @Optional()
  @IsIn(['account'])
  type?: 'account';
}
