import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
export const Optional = () =>
  ValidateIf((_object: unknown, value: unknown) => value !== undefined);

@ValidatorConstraint({ name: 'databaseId', async: false })
export class DatabaseIdConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      /^[1-9]\d{0,18}$/.test(value) &&
      BigInt(value) <= 9223372036854775807n
    );
  }
  defaultMessage(): string {
    return 'ID 必须是有效的 64 位正整数字符串';
  }
}

export class IdParamDto {
  @ApiProperty({
    type: String,
    example: '1',
    pattern: '^[1-9][0-9]{0,18}$',
    description: '64 位正整数 ID，以字符串传输',
  })
  @Validate(DatabaseIdConstraint)
  id!: string;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    default: 1,
    minimum: 1,
    maximum: 100000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  current = 1;

  @ApiPropertyOptional({
    type: 'integer',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class TenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '企业名称，支持包含匹配',
    maxLength: 100,
  })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  name?: string;
}
