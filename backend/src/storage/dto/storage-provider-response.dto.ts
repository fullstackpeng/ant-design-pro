import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class StorageProviderDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() protocol!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  config!: Record<string, unknown>;
  @ApiProperty({
    type: [String],
    description: '已配置的密钥字段名，不包含密钥值',
  })
  secretKeys!: string[];
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: 'integer' }) revision!: number;
}

export class StorageProviderListResponseDto extends SuccessDto {
  @ApiProperty({ type: [StorageProviderDto] })
  data!: StorageProviderDto[];
}

export class StorageFieldDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty({
    enum: ['text', 'password', 'boolean', 'number', 'select'],
  })
  type!: string;
  @ApiPropertyOptional() required?: boolean;
  @ApiPropertyOptional() placeholder?: string;
  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
  })
  default?: string | number | boolean;
  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      properties: { label: { type: 'string' }, value: { type: 'string' } },
    },
  })
  options?: { label: string; value: string }[];
}

export class StorageProtocolDto {
  @ApiProperty() protocol!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ type: [StorageFieldDto] }) configFields!: StorageFieldDto[];
  @ApiProperty({ type: [StorageFieldDto] }) secretFields!: StorageFieldDto[];
}

export class StorageProtocolListResponseDto extends SuccessDto {
  @ApiProperty({ type: [StorageProtocolDto] })
  data!: StorageProtocolDto[];
}
