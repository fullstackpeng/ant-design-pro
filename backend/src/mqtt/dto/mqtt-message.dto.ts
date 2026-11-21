import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';
import {
  Optional,
  PaginationQueryDto,
  Trim,
} from '../../common/dto/request.dto.js';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class MqttMessageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '租户 ID' })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(20)
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Topic 包含匹配' })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(512)
  topic?: string;

  @ApiPropertyOptional({ enum: ['inbound', 'outbound'] })
  @Optional()
  @IsIn(['inbound', 'outbound'])
  direction?: string;
}

export class MqttMessageDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiProperty() tenantCode!: string;
  @ApiProperty() tenantName!: string;
  @ApiProperty() brokerType!: string;
  @ApiProperty({ type: String }) brokerId!: string;
  @ApiProperty() topic!: string;
  @ApiProperty() payload!: string;
  @ApiProperty() payloadEncoding!: string;
  @ApiProperty({ type: 'integer' }) qos!: number;
  @ApiProperty() retain!: boolean;
  @ApiProperty() direction!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class MqttMessageListResponseDto extends SuccessDto {
  @ApiProperty({ type: [MqttMessageDto] }) data!: MqttMessageDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}

export class MqttCleanupResultDto {
  @ApiProperty({ type: 'integer' }) deleted!: number;
}

export class MqttCleanupResponseDto extends SuccessDto {
  @ApiProperty({ type: () => MqttCleanupResultDto })
  data!: MqttCleanupResultDto;
}

export class MqttCleanupQueryDto {
  @ApiPropertyOptional({ description: '仅清理该租户，省略表示全部' })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(20)
  tenantId?: string;
}
