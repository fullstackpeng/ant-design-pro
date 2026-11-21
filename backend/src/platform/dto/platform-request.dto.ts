import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  NotEquals,
  Validate,
  ValidateNested,
} from 'class-validator';
import { AccountDto } from '../../common/dto/account.dto.js';
import {
  DatabaseIdConstraint,
  Optional,
  Trim,
} from '../../common/dto/request.dto.js';

class NameDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

class TenantDetailsDto extends NameDto {
  @ApiPropertyOptional({
    maxLength: 64,
    description: '平台 industry 字典值，空字符串表示未填写；省略则保留现值',
  })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(64)
  industry?: string;
}

export class CreateTenantDto extends TenantDetailsDto {
  @ApiProperty({
    example: 'acme',
    pattern: '^[a-z0-9][a-z0-9-]{0,63}$',
    maxLength: 64,
    description: '创建后不可修改；不能使用保留编码 platform',
  })
  @Trim()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/)
  @NotEquals('platform')
  code!: string;

  @ApiProperty({ type: () => AccountDto, description: '首位租户管理员' })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => AccountDto)
  admin!: AccountDto;
}

export class UpdateTenantDto extends TenantDetailsDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class UpdatePlanDto extends NameDto {
  @ApiProperty({ minimum: 1, maximum: 100000, type: 'integer', example: 10 })
  @IsInt()
  @Min(1)
  @Max(100000)
  maxMembers!: number;

  @ApiProperty({ description: '是否允许新的人工分配，不影响已有订阅' })
  @IsBoolean()
  isActive!: boolean;
}

export class CreatePlanDto extends UpdatePlanDto {
  @ApiProperty({
    pattern: '^[a-z0-9][a-z0-9-]{0,63}$',
    maxLength: 64,
    example: 'basic',
  })
  @Trim()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/)
  @NotEquals('platform')
  code!: string;
}

export class AssignPlanDto {
  @ApiProperty({
    type: String,
    example: '1',
    description: '套餐 ID，64 位正整数字符串',
  })
  @Validate(DatabaseIdConstraint)
  planId!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'ISO 8601 格式，必须晚于当前时间',
  })
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'expiresAt 必须包含时间及明确时区',
  })
  expiresAt!: string;

  @ApiProperty({ description: '订阅是否启用' })
  @IsBoolean()
  isActive!: boolean;
}
