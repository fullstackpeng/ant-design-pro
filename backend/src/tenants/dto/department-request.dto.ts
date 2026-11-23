import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
} from 'class-validator';
import { DatabaseIdConstraint, Trim } from '../../common/dto/request.dto.js';

export class CreateDepartmentDto {
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

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @Validate(DatabaseIdConstraint)
  parentId?: string | null;
}
export class UpdateDepartmentDto extends CreateDepartmentDto {}
