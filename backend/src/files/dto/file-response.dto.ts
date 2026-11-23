import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';

export class FileDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty({ type: String, description: '字节数，以字符串传输' })
  size!: string;
  @ApiProperty() providerName!: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '平台文件为 null',
  })
  tenantCode?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  tenantName?: string | null;
  @ApiProperty() uploadedByName!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class FileListResponseDto extends SuccessDto {
  @ApiProperty({ type: [FileDto] }) data!: FileDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}

export class FileUsageDto {
  @ApiProperty({ type: String }) usedBytes!: string;
  @ApiProperty({ type: String }) quotaBytes!: string;
  @ApiProperty({ type: String }) maxFileSizeBytes!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  planName?: string | null;
}

export class FileUsageResponseDto extends SuccessDto {
  @ApiProperty({ type: () => FileUsageDto }) data!: FileUsageDto;
}

export class FileDownloadDto {
  @ApiProperty() url!: string;
  @ApiProperty({ type: 'integer' }) expiresInSeconds!: number;
}

export class FileDownloadResponseDto extends SuccessDto {
  @ApiProperty({ type: () => FileDownloadDto }) data!: FileDownloadDto;
}

export class SiteAssetDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({
    example: '/api/site-assets/1',
    description: '可写入系统配置的稳定公开地址',
  })
  url!: string;
}

export class SiteAssetResponseDto extends SuccessDto {
  @ApiProperty({ type: () => SiteAssetDto }) data!: SiteAssetDto;
}

export class NotificationAssetDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({
    example: '/api/notification-assets/1',
    description: '可写入通知正文的稳定地址，需要登录会话访问',
  })
  url!: string;
}

export class NotificationAssetResponseDto extends SuccessDto {
  @ApiProperty({ type: () => NotificationAssetDto })
  data!: NotificationAssetDto;
}
