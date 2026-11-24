import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../../common/dto/response.dto.js';

export class AiOptionDto {
  @ApiProperty() value!: string;
  @ApiProperty() label!: string;
}
export class AiOptionsDto {
  @ApiProperty({ type: [AiOptionDto] }) permissions!: AiOptionDto[];
  @ApiProperty({ type: [AiOptionDto] }) pages!: AiOptionDto[];
}
export class AiOptionsResponse extends SuccessDto {
  @ApiProperty({ type: AiOptionsDto }) data!: AiOptionsDto;
}
