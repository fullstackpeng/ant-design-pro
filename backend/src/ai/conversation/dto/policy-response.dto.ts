import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';
export class AiPolicyDto {
  @ApiProperty() conversationRetentionDays!: number;
  @ApiProperty() revision!: number;
}
export class AiPolicyDtoResponse extends SuccessDto {
  @ApiProperty({ type: AiPolicyDto }) data!: AiPolicyDto;
}
