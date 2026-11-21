import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Validate } from 'class-validator';
import {
  DatabaseIdConstraint,
  Optional,
} from '../../common/dto/request.dto.js';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class VerifyMqttCredentialDto {
  @ApiProperty({
    format: 'password',
    writeOnly: true,
    description: '当前登录用户密码，用于二次校验',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;
}

export class MqttPlatformInfoDto {
  @ApiProperty() host!: string;
  @ApiProperty({ type: 'integer' }) port!: number;
  @ApiProperty() useTls!: boolean;
  @ApiProperty({ type: [String] }) protocols!: string[];
}

export class MqttCredentialMetadataDto {
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() roleName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() lastError!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  provisionedAt?: string | null;
  @ApiProperty({ type: () => MqttPlatformInfoDto })
  platform!: MqttPlatformInfoDto;
  @ApiProperty() topicPrefix!: string;
}

export class MqttCredentialMetadataResponseDto extends SuccessDto {
  @ApiProperty({ type: () => MqttCredentialMetadataDto, nullable: true })
  data!: MqttCredentialMetadataDto | null;
}

export class RevealedMqttCredentialDto {
  @ApiProperty() username!: string;
  @ApiProperty() password!: string;
  @ApiProperty() host!: string;
  @ApiProperty({ type: 'integer' }) port!: number;
  @ApiProperty() useTls!: boolean;
  @ApiProperty({ type: [String] }) protocols!: string[];
  @ApiProperty() topicPrefix!: string;
}

export class RevealedMqttCredentialResponseDto extends SuccessDto {
  @ApiProperty({ type: () => RevealedMqttCredentialDto })
  data!: RevealedMqttCredentialDto;
}

export class PlatformTenantMqttRowDto {
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiProperty() tenantCode!: string;
  @ApiProperty() tenantName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() username!: string;
  @ApiProperty() lastError!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  provisionedAt?: string | null;
}

export class PlatformTenantMqttListResponseDto extends SuccessDto {
  @ApiProperty({ type: [PlatformTenantMqttRowDto] })
  data!: PlatformTenantMqttRowDto[];
}

export class PlatformTenantParamDto {
  @ApiProperty({
    type: String,
    description: '租户 ID，64 位正整数字符串',
  })
  @Validate(DatabaseIdConstraint)
  tenantId!: string;
}

export class MqttProvisionQueryDto {
  @ApiPropertyOptional({ description: '租户 ID，仅用于过滤' })
  @Optional()
  @IsString()
  @MaxLength(20)
  tenantId?: string;
}
