import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from './request.dto.js';

export class AccountDto {
  @ApiProperty({
    enum: ['new', 'existing'],
    description: '新建账号或添加已有账号；已有账号的密码不会被修改',
  })
  @IsIn(['new', 'existing'])
  mode!: 'new' | 'existing';

  @ApiProperty({ maxLength: 64, example: 'alice' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @ApiPropertyOptional({ description: 'mode=new 时必填', maxLength: 100 })
  @ValidateIf(
    (object: AccountDto) => object.mode === 'new' || object.name !== undefined,
  )
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'mode=new 时必填；仅用于初始化新账号',
    minLength: 8,
    maxLength: 1024,
    format: 'password',
    writeOnly: true,
  })
  @ValidateIf(
    (object: AccountDto) =>
      object.mode === 'new' || object.password !== undefined,
  )
  @IsString()
  @MinLength(8)
  @MaxLength(1024)
  password?: string;
}
