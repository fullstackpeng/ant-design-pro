import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class DepartmentDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, nullable: true }) parentId!: string | null;
}
export class DepartmentListResponseDto extends SuccessDto {
  @ApiProperty({ type: [DepartmentDto] }) data!: DepartmentDto[];
}
