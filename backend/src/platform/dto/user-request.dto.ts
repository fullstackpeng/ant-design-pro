import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  Optional,
  PaginationQueryDto,
  Trim,
} from '../../common/dto/request.dto.js';
export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}
export class CreateUserDto {
  @ApiProperty({ maxLength: 64 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @ApiProperty({
    minLength: 8,
    maxLength: 1024,
    writeOnly: true,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(1024)
  password!: string;
}
export class UpdateUserDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
export class ResetPasswordDto {
  @ApiProperty({
    minLength: 8,
    maxLength: 1024,
    writeOnly: true,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(1024)
  password!: string;
}
