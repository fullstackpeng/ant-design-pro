import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';
import { DictionaryDto, DictionaryItemDto } from './dictionary-response.dto.js';

export class PlatformDictionaryDto extends DictionaryDto {
  @ApiProperty({ type: 'integer' }) revision!: number;
}
export class PlatformDictionaryItemDto extends DictionaryItemDto {
  @ApiProperty({ type: 'integer' }) revision!: number;
}
export class PlatformDictionaryDetailDto extends PlatformDictionaryDto {
  @ApiProperty({ type: [PlatformDictionaryItemDto] })
  items!: PlatformDictionaryItemDto[];
}
export class PlatformDictionaryDetailResponseDto extends SuccessDto {
  @ApiProperty({ type: PlatformDictionaryDetailDto })
  data!: PlatformDictionaryDetailDto;
}
export class PlatformDictionaryListResponseDto extends SuccessDto {
  @ApiProperty({ type: [PlatformDictionaryDto] })
  data!: PlatformDictionaryDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
