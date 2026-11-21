import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/dto/request.dto.js';
import { MQTT_PROTOCOLS } from '../mqtt.constants.js';

export class UpdateMqttPlatformBrokerDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ maxLength: 255 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  host!: string;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 65535 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @ApiProperty()
  @IsBoolean()
  useTls!: boolean;

  @ApiProperty({ enum: [...MQTT_PROTOCOLS] })
  @IsIn(MQTT_PROTOCOLS)
  defaultProtocol!: string;

  @ApiProperty({ maxLength: 150 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  adminUsername!: string;

  @ApiPropertyOptional({
    maxLength: 1024,
    writeOnly: true,
    description: '留空表示保持现有管理密码',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  adminPassword?: string;

  @ApiProperty({ maxLength: 150 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  bridgeUsername!: string;

  @ApiPropertyOptional({
    maxLength: 1024,
    writeOnly: true,
    description: '留空表示保持现有 Bridge 密码',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  bridgePassword?: string;

  @ApiProperty({ maxLength: 200 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  responseTopic!: string;

  @ApiProperty({ type: 'integer', minimum: 1000, maximum: 60000 })
  @IsInt()
  @Min(1000)
  @Max(60000)
  commandTimeoutMs!: number;

  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: '首次创建时传 0',
  })
  @IsInt()
  @Min(0)
  revision!: number;
}
