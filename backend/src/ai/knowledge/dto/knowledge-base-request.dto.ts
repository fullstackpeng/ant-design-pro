import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Trim } from '../../../common/dto/request.dto.js';

export class CreateAiKnowledgeBaseDto {
  @ApiProperty() @IsString() @Matches(/^[a-z][a-z0-9-]{0,63}$/) code!: string;
  @ApiProperty()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
  @ApiProperty() @IsString() @MaxLength(500) description!: string;
  @ApiProperty() @IsBoolean() isActive!: boolean;
}
export class UpdateAiKnowledgeBaseDto extends CreateAiKnowledgeBaseDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
}
