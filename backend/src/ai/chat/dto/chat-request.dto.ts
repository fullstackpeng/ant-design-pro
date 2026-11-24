import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Validate } from 'class-validator';
import {
  DatabaseIdConstraint,
  Optional,
  Trim,
} from '../../../common/dto/request.dto.js';

export class AiChatRequestDto {
  @ApiProperty() @Validate(DatabaseIdConstraint) assistantId!: string;
  @ApiPropertyOptional()
  @Optional()
  @Validate(DatabaseIdConstraint)
  conversationId?: string;
  @ApiPropertyOptional({
    description: '用户明确选择的指南 ID；服务端重新校验访问权限',
  })
  @Optional()
  @Validate(DatabaseIdConstraint)
  documentId?: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  question!: string;
}
