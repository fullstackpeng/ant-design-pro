import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/dto/request.dto.js';

export class CreatePositionDto {
  @ApiProperty({ maxLength: 64 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1000000 })
  @IsInt()
  @Min(0)
  @Max(1000000)
  sortOrder!: number;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
export class UpdatePositionDto extends CreatePositionDto {}
