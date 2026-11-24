import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';
export class AiConversationDto {
  @ApiProperty() id!: string;
  @ApiProperty() assistantId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() updatedAt!: string;
}
export class AiConversationDtoResponse extends SuccessDto {
  @ApiProperty({ type: AiConversationDto }) data!: AiConversationDto;
}
export class AiConversationListResponse extends SuccessDto {
  @ApiProperty({ type: [AiConversationDto] }) data!: AiConversationDto[];
  @ApiProperty() total!: number;
}
