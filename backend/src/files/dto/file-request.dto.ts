import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import {
  Optional,
  PaginationQueryDto,
  Trim,
} from '../../common/dto/request.dto.js';

export class FileQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '文件名，支持包含匹配', maxLength: 255 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(255)
  keyword?: string;
}

export class PlatformFileQueryDto extends FileQueryDto {
  @ApiPropertyOptional({
    description: '租户编码或名称，支持包含匹配',
    maxLength: 100,
  })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  tenant?: string;
}
