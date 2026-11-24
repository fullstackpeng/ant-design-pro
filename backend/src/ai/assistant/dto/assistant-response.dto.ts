import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';
export class AiAssistantDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isPublic!: boolean;
  @ApiProperty() permissionMode!: string;
  @ApiProperty() publicationScope!: string;
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty({ type: [String] }) tenantIds!: string[];
  @ApiProperty({ type: [String] }) knowledgeBaseIds!: string[];
  @ApiProperty() prompt!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  retrievalConfig!: Record<string, unknown>;
  @ApiProperty() revision!: number;
}
export class AiAssistantDtoResponse extends SuccessDto {
  @ApiProperty({ type: AiAssistantDto }) data!: AiAssistantDto;
}
export class AiAssistantListResponse extends SuccessDto {
  @ApiProperty({ type: [AiAssistantDto] }) data!: AiAssistantDto[];
  @ApiProperty() total!: number;
}
