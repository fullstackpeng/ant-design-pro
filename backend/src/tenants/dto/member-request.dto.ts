import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';
import { AccountDto } from '../../common/dto/account.dto.js';

export class CreateMemberDto extends AccountDto {
  @ApiProperty({ enum: ['admin', 'user'] })
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user';
}

export class UpdateMemberDto {
  @ApiProperty({ enum: ['admin', 'user'] })
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user';

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
