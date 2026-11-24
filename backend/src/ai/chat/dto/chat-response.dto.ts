import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';

export class AiSourceDto {
  @ApiProperty() documentId!: string;
  @ApiProperty() chunkId!: string;
  @ApiProperty() version!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) route!: string | null;
}
export class AiAnswerDto {
  @ApiProperty() kind!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ type: [AiSourceDto] }) sources!: AiSourceDto[];
  @ApiProperty() strategy!: string;
}
export class AiChatDto extends AiAnswerDto {
  @ApiProperty() conversationId!: string;
  @ApiProperty() requestId!: string;
}
export class AiChatResponse extends SuccessDto {
  @ApiProperty({ type: AiChatDto }) data!: AiChatDto;
}
export class AiMessageDto {
  @ApiProperty() id!: string;
  @ApiProperty() role!: string;
  @ApiProperty() content!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [AiSourceDto] }) sources!: AiSourceDto[];
}
export class AiMessageListResponse extends SuccessDto {
  @ApiProperty({ type: [AiMessageDto] }) data!: AiMessageDto[];
  @ApiProperty() total!: number;
}
export class AiAccessibleAssistantDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}
export class AiAccessibleAssistantListResponse extends SuccessDto {
  @ApiProperty({ type: [AiAccessibleAssistantDto] })
  data!: AiAccessibleAssistantDto[];
}
