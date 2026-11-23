import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim } from '../../common/dto/request.dto.js';

export class UpdateAccountProfileDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class ChangeAccountPasswordDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 1024,
    writeOnly: true,
    format: 'password',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  currentPassword!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 1024,
    writeOnly: true,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(1024)
  newPassword!: string;
}

export class AccountAvatarParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  version!: string;
}
