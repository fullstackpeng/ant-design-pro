import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Optional, Trim } from '../../common/dto/request.dto.js';
import { SuccessDto } from '../../common/dto/response.dto.js';
import { MQTT_PROTOCOLS } from '../mqtt.constants.js';

export class CreateTenantMqttBrokerDto {
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
  protocolVersion!: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(150)
  username?: string;

  @ApiPropertyOptional({ maxLength: 1024, writeOnly: true })
  @Optional()
  @IsString()
  @MaxLength(1024)
  password?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  clientIdPrefix?: string;

  @ApiPropertyOptional({ maxLength: 512, default: '#' })
  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  subscribeFilter?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 10, maximum: 3600 })
  @Optional()
  @IsInt()
  @Min(10)
  @Max(3600)
  keepaliveSeconds?: number;

  @ApiPropertyOptional()
  @Optional()
  @IsBoolean()
  cleanStart?: boolean;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 604800 })
  @Optional()
  @IsInt()
  @Min(0)
  @Max(604800)
  sessionExpirySeconds?: number;

  @ApiPropertyOptional({ type: 'integer', enum: [0, 1, 2] })
  @Optional()
  @IsIn([0, 1, 2])
  defaultQos?: number;

  @ApiPropertyOptional({ default: true })
  @Optional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantMqttBrokerDto extends CreateTenantMqttBrokerDto {
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: '读取到的版本号',
  })
  @IsInt()
  @Min(0)
  revision!: number;
}

export class TenantMqttBrokerDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiPropertyOptional() tenantCode?: string;
  @ApiPropertyOptional() tenantName?: string;
  @ApiProperty() name!: string;
  @ApiProperty() host!: string;
  @ApiProperty({ type: 'integer' }) port!: number;
  @ApiProperty() useTls!: boolean;
  @ApiProperty({ enum: ['3.1.1', '5'] }) protocolVersion!: string;
  @ApiProperty() username!: string;
  @ApiProperty() hasPassword!: boolean;
  @ApiProperty() clientIdPrefix!: string;
  @ApiProperty() subscribeFilter!: string;
  @ApiProperty({ type: 'integer' }) keepaliveSeconds!: number;
  @ApiProperty() cleanStart!: boolean;
  @ApiProperty({ type: 'integer' }) sessionExpirySeconds!: number;
  @ApiProperty({ type: 'integer' }) defaultQos!: number;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: 'integer' }) revision!: number;
}

export class TenantMqttBrokerListResponseDto extends SuccessDto {
  @ApiProperty({ type: [TenantMqttBrokerDto] })
  data!: TenantMqttBrokerDto[];
}

export class TenantMqttBrokerResponseDto extends SuccessDto {
  @ApiProperty({ type: () => TenantMqttBrokerDto })
  data!: TenantMqttBrokerDto;
}
