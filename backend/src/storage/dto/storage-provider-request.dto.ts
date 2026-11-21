import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/dto/request.dto.js';

export class CreateStorageProviderDto {
  @ApiProperty({ maxLength: 64, example: 'main-s3' })
  @Trim()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/)
  code!: string;

  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ maxLength: 32, example: 's3' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  protocol!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: '协议定义的非敏感配置',
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: '协议定义的密钥字段，写入后加密保存',
  })
  @IsObject()
  secrets!: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStorageProviderDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: '省略或留空表示保持现有密钥',
  })
  @IsOptional()
  @IsObject()
  secrets?: Record<string, unknown>;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ type: 'integer', minimum: 0 })
  @IsInt()
  @Min(0)
  revision!: number;
}
