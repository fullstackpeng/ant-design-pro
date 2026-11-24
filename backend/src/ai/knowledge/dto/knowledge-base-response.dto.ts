import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';
export class AiKnowledgeBaseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() revision!: number;
}
export class AiKnowledgeBaseDtoResponse extends SuccessDto {
  @ApiProperty({ type: AiKnowledgeBaseDto }) data!: AiKnowledgeBaseDto;
}
export class AiKnowledgeBaseListResponse extends SuccessDto {
  @ApiProperty({ type: [AiKnowledgeBaseDto] }) data!: AiKnowledgeBaseDto[];
  @ApiProperty() total!: number;
}
