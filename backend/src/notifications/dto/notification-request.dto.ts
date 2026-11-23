import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import {
  DatabaseIdConstraint,
  Optional,
  PaginationQueryDto,
  Trim,
} from '../../common/dto/request.dto.js';
import {
  MAX_NOTIFICATION_TARGETS,
  notificationTypes,
} from '../notifications.constants.js';

const TrimArray = () =>
  Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((item) => String(item).trim()) : value,
  );

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: notificationTypes })
  @Optional()
  @IsIn(notificationTypes)
  type?: (typeof notificationTypes)[number];

  @ApiPropertyOptional({ maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}

export class InboxQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: notificationTypes })
  @Optional()
  @IsIn(notificationTypes)
  type?: (typeof notificationTypes)[number];

  @ApiPropertyOptional({ enum: ['all', 'unread', 'read'], default: 'all' })
  @Optional()
  @IsIn(['all', 'unread', 'read'])
  status?: 'all' | 'unread' | 'read' = 'all';
}

export class CreateNotificationDto {
  @ApiProperty({ enum: notificationTypes })
  @IsIn(notificationTypes)
  type!: (typeof notificationTypes)[number];

  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ description: 'TinyMCE 生成的 HTML，服务端会消毒' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200000)
  contentHtml!: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  @Optional()
  @IsDateString()
  publishAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @Optional()
  @IsDateString()
  expireAt?: string;

  @ApiPropertyOptional({
    type: [String],
    description: '平台通知定向到租户 ID；公告忽略该字段',
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(MAX_NOTIFICATION_TARGETS)
  @TrimArray()
  @Validate(DatabaseIdConstraint, { each: true })
  targetTenantIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: '租户通知定向到成员用户 ID；公告忽略该字段',
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(MAX_NOTIFICATION_TARGETS)
  @TrimArray()
  @Validate(DatabaseIdConstraint, { each: true })
  targetUserIds?: string[];
}

export class UpdateNotificationDto extends CreateNotificationDto {}
