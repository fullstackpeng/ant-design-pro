import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IdParamDto,
  Optional,
  PaginationQueryDto,
  Trim,
} from '../../common/dto/request.dto.js';

export class DictionaryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}

export class DictionaryCodeParamDto {
  @ApiProperty({ pattern: '^[a-z][a-z0-9_-]{0,63}$' })
  @Matches(/^[a-z][a-z0-9_-]{0,63}$/)
  code!: string;
}

export class DictionaryItemParamDto extends IdParamDto {
  @ApiProperty({ pattern: '^[a-z][a-z0-9_-]{0,63}$' })
  @Matches(/^[a-z][a-z0-9_-]{0,63}$/)
  code!: string;
}

export class UpdateDictionaryDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ maxLength: 500, default: '' })
  @Trim()
  @IsString()
  @MaxLength(500)
  remark!: string;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class CreateDictionaryDto extends UpdateDictionaryDto {
  @ApiProperty({ pattern: '^[a-z][a-z0-9_-]{0,63}$' })
  @Trim()
  @Matches(/^[a-z][a-z0-9_-]{0,63}$/)
  code!: string;
}

export class UpdateDictionaryItemDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1000000 })
  @IsInt()
  @Min(0)
  @Max(1000000)
  sortOrder!: number;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({
    enum: ['', 'blue', 'green', 'orange', 'red', 'purple', 'cyan'],
  })
  @IsIn(['', 'blue', 'green', 'orange', 'red', 'purple', 'cyan'])
  color!: string;
}

export class CreateDictionaryItemDto extends UpdateDictionaryItemDto {
  @ApiProperty({ pattern: '^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$' })
  @Trim()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/)
  value!: string;
}
