import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  Validate,
  ValidateIf,
} from 'class-validator';
import { AccountDto } from '../../common/dto/account.dto.js';
import {
  DatabaseIdConstraint,
  Optional,
  PaginationQueryDto,
} from '../../common/dto/request.dto.js';

export class CreateMemberDto extends AccountDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @Validate(DatabaseIdConstraint)
  departmentId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50, uniqueItems: true })
  @Optional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Validate(DatabaseIdConstraint, { each: true })
  positionIds?: string[];

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
  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @Validate(DatabaseIdConstraint)
  departmentId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50, uniqueItems: true })
  @Optional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Validate(DatabaseIdConstraint, { each: true })
  positionIds?: string[];

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

export class MemberQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '部门 ID（包含下级），unassigned 表示未分配',
    type: String,
  })
  @Optional()
  @ValidateIf(
    (_object: unknown, value: unknown) =>
      value !== undefined && value !== 'unassigned',
  )
  @Validate(DatabaseIdConstraint)
  departmentId?: string;

  @ApiPropertyOptional({
    description: '岗位 ID，unassigned 表示未分配',
    type: String,
  })
  @Optional()
  @ValidateIf(
    (_object: unknown, value: unknown) =>
      value !== undefined && value !== 'unassigned',
  )
  @Validate(DatabaseIdConstraint)
  positionId?: string;
}
