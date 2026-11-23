import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class NotificationDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: ['platform', 'tenant'] })
  source!: string;

  @ApiProperty({ enum: ['notice', 'announcement'] })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ description: '已消毒的 HTML' })
  contentHtml!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  publishAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  expireAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  readAt!: string | null;

  @ApiProperty({ type: [String] })
  targetTenantIds!: string[];

  @ApiProperty({ type: [String] })
  targetUserIds!: string[];

  @ApiProperty()
  creatorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class NotificationListResponseDto extends SuccessDto {
  @ApiProperty({ type: () => [NotificationDto] })
  data!: NotificationDto[];

  @ApiProperty({ type: 'integer' })
  total!: number;

  @ApiProperty({ type: 'integer', description: '符合筛选条件的未读总数' })
  unreadTotal!: number;
}

export class NotificationDetailResponseDto extends SuccessDto {
  @ApiProperty({ type: () => NotificationDto })
  data!: NotificationDto;
}
