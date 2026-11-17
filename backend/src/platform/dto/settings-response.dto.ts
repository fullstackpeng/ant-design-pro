import { ApiProperty } from '@nestjs/swagger';
import { SuccessDto } from '../../common/dto/response.dto.js';
import { SITE_LOCALES } from '../settings.constants.js';

export class PublicSiteSettingsDto {
  @ApiProperty() title!: string;
  @ApiProperty() logo!: string;
  @ApiProperty() loginBackground!: string;
  @ApiProperty() footerText!: string;
  @ApiProperty() colorPrimary!: string;
  @ApiProperty({ enum: [...SITE_LOCALES] }) defaultLocale!: string;
}
export class SiteSettingsDto extends PublicSiteSettingsDto {
  @ApiProperty({ type: 'integer' }) revision!: number;
}
export class PublicSiteSettingsResponseDto extends SuccessDto {
  @ApiProperty({ type: PublicSiteSettingsDto }) data!: PublicSiteSettingsDto;
}
export class SiteSettingsResponseDto extends SuccessDto {
  @ApiProperty({ type: SiteSettingsDto }) data!: SiteSettingsDto;
}
export class SiteSettingsAuditDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) actorId!: string;
  @ApiProperty() actorName!: string;
  @ApiProperty({ type: SiteSettingsDto }) before!: SiteSettingsDto;
  @ApiProperty({ type: SiteSettingsDto }) after!: SiteSettingsDto;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
export class SiteSettingsAuditListResponseDto extends SuccessDto {
  @ApiProperty({ type: [SiteSettingsAuditDto] }) data!: SiteSettingsAuditDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
}
