import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class DictionaryDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() remark!: string;
  @ApiProperty() isActive!: boolean;
}

export class DictionaryItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() value!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() color!: string;
}

export class DictionaryListResponseDto extends SuccessDto {
  @ApiProperty({ type: [DictionaryDto] }) data!: DictionaryDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}

export class DictionaryDetailDto extends DictionaryDto {
  @ApiProperty({ type: [DictionaryItemDto] }) items!: DictionaryItemDto[];
}

export class DictionaryDetailResponseDto extends SuccessDto {
  @ApiProperty({ type: DictionaryDetailDto }) data!: DictionaryDetailDto;
}

export class DictionaryAuditDto {
  @ApiProperty() id!: string;
  @ApiProperty() actorId!: string;
  @ApiProperty() actorName!: string;
  @ApiProperty({ enum: ['type', 'item'] }) entityType!: string;
  @ApiProperty() targetValue!: string;
  @ApiProperty({ enum: ['create', 'update'] }) action!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) before!: Record<
    string,
    unknown
  >;
  @ApiProperty({ type: 'object', additionalProperties: true }) after!: Record<
    string,
    unknown
  >;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
export class DictionaryAuditListResponseDto extends SuccessDto {
  @ApiProperty({ type: [DictionaryAuditDto] }) data!: DictionaryAuditDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
