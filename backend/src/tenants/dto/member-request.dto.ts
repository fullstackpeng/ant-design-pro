import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  Validate,
} from 'class-validator';
import { AccountDto } from '../../common/dto/account.dto.js';
import {
  DatabaseIdConstraint,
  Optional,
} from '../../common/dto/request.dto.js';

export class CreateMemberDto extends AccountDto {
  @ApiPropertyOptional({ type: [String], maxItems: 50, uniqueItems: true })
  @Optional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Validate(DatabaseIdConstraint, { each: true })
  roleIds?: string[];

  @ApiProperty({ enum: ['admin', 'user'] })
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user';
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ type: [String], maxItems: 50, uniqueItems: true })
  @Optional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Validate(DatabaseIdConstraint, { each: true })
  roleIds?: string[];

  @ApiProperty({ enum: ['admin', 'user'] })
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user';

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
