import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';
export class AiDocumentDto {
  @ApiProperty() id!: string;
  @ApiProperty() knowledgeBaseId!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: [String] }) standardQuestions!: string[];
  @ApiProperty({ type: [String] }) synonyms!: string[];
  @ApiProperty({ type: [String] }) keywords!: string[];
  @ApiProperty() content!: string;
  @ApiProperty({ type: [String] }) steps!: string[];
  @ApiProperty({ type: String, nullable: true }) pageCode!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() isPublic!: boolean;
  @ApiProperty() permissionMode!: string;
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty() version!: number;
  @ApiProperty() revision!: number;
}
export class AiDocumentDtoResponse extends SuccessDto {
  @ApiProperty({ type: AiDocumentDto }) data!: AiDocumentDto;
}
export class AiDocumentListResponse extends SuccessDto {
  @ApiProperty({ type: [AiDocumentDto] }) data!: AiDocumentDto[];
  @ApiProperty() total!: number;
}
