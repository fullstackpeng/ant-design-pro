import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class PositionDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty() isActive!: boolean;
}
export class PositionListResponseDto extends SuccessDto {
  @ApiProperty({ type: [PositionDto] }) data!: PositionDto[];
}
