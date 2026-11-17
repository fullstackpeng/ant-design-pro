import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/dto/request.dto.js';
export class CreateRoleDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @ApiProperty({ type: [String], maxItems: 100, uniqueItems: true })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9:-]{1,100}$/, { each: true })
  permissions!: string[];
}

export class UpdateRoleDto extends CreateRoleDto {}
