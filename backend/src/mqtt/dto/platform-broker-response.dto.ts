import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class MqttPlatformBrokerDto {
  @ApiProperty({ type: 'integer' }) id!: number;
  @ApiProperty() name!: string;
  @ApiProperty() host!: string;
  @ApiProperty({ type: 'integer' }) port!: number;
  @ApiProperty() useTls!: boolean;
  @ApiProperty({ enum: ['3.1.1', '5'] }) defaultProtocol!: string;
  @ApiProperty() adminUsername!: string;
  @ApiProperty() hasAdminPassword!: boolean;
  @ApiProperty() bridgeUsername!: string;
  @ApiProperty() hasBridgePassword!: boolean;
  @ApiProperty() responseTopic!: string;
  @ApiProperty({ type: 'integer' }) commandTimeoutMs!: number;
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty({ type: 'integer' }) revision!: number;
}

export class MqttPlatformBrokerResponseDto extends SuccessDto {
  @ApiProperty({
    type: () => MqttPlatformBrokerDto,
    nullable: true,
  })
  data!: MqttPlatformBrokerDto | null;
}
