import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateAiPolicyDto {
  @ApiProperty({ minimum: 1, maximum: 3650 })
  @IsInt()
  @Min(1)
  @Max(3650)
  conversationRetentionDays!: number;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) revision!: number;
}
