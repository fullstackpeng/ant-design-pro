import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import {
  UpdateDictionaryDto,
  UpdateDictionaryItemDto,
} from './dictionary-request.dto.js';

export class UpdatePlatformDictionaryDto extends UpdateDictionaryDto {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 2147483646 })
  @IsInt()
  @Min(0)
  @Max(2147483646)
  revision!: number;
}

export class UpdatePlatformDictionaryItemDto extends UpdateDictionaryItemDto {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 2147483646 })
  @IsInt()
  @Min(0)
  @Max(2147483646)
  revision!: number;
}
