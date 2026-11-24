import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import { DatabaseIdConstraint, Trim } from '../../../common/dto/request.dto.js';

export class CreateAiAssistantDto {
  @ApiProperty() @IsString() @Matches(/^[a-z][a-z0-9-]{0,63}$/) code!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
  @ApiProperty() @IsBoolean() isActive!: boolean;
  @ApiProperty({ enum: ['none', 'all', 'selected'] })
  @IsIn(['none', 'all', 'selected'])
  publicationScope!: 'none' | 'all' | 'selected';
  @ApiProperty({ type: [String], maxItems: 1000 })
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @Validate(DatabaseIdConstraint, { each: true })
  tenantIds!: string[];
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Validate(DatabaseIdConstraint, { each: true })
  knowledgeBaseIds!: string[];
  @ApiProperty() @IsString() @MaxLength(8000) prompt!: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      exact: true,
      keyword: true,
      trigram: false,
      vector: false,
      topK: 4,
    },
  })
  @IsObject()
  retrievalConfig!: Record<string, unknown>;
  @ApiProperty({ default: false }) @IsBoolean() isPublic!: boolean;
  @ApiProperty({ enum: ['ALL', 'ANY'], default: 'ALL' })
  @IsIn(['ALL', 'ANY'])
  permissionMode!: 'ALL' | 'ANY';
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  permissions!: string[];
}
export class UpdateAiAssistantDto extends CreateAiAssistantDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
}
