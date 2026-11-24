import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import {
  DatabaseIdConstraint,
  Optional,
  Trim,
} from '../../../common/dto/request.dto.js';

export class CreateAiDocumentDto {
  @ApiProperty() @Validate(DatabaseIdConstraint) knowledgeBaseId!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
  @ApiProperty({ type: [String], maxItems: 30 })
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  standardQuestions!: string[];
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  synonyms!: string[];
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  keywords!: string[];
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(12000) content!: string;
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(1000, { each: true })
  steps!: string[];
  @ApiPropertyOptional()
  @Optional()
  @IsString()
  @MaxLength(64)
  pageCode?: string;
  @ApiProperty({ enum: ['draft', 'published', 'disabled'] })
  @IsIn(['draft', 'published', 'disabled'])
  status!: 'draft' | 'published' | 'disabled';
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
export class UpdateAiDocumentDto extends CreateAiDocumentDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
}
