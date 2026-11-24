import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../audit/audit-action.js';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { PaginationQueryDto } from '../common/dto/request.dto.js';
import { ApiErrors } from '../common/dto/response.dto.js';
import { UpdateSiteSettingsDto } from './dto/settings-request.dto.js';
import {
  PublicSiteSettingsResponseDto,
  SiteSettingsAuditListResponseDto,
  SiteSettingsResponseDto,
} from './dto/settings-response.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('api')
@ApiTags('settings')
@ApiErrors()
@ApiExtraModels(PaginationQueryDto)
export class SettingsController {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('site-settings')
  @Public()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'publicSiteSettings',
    summary: '查询公开的站点展示配置',
  })
  @ApiOkResponse({ type: PublicSiteSettingsResponseDto })
  publicSettings(): Promise<PublicSiteSettingsResponseDto> {
    return this.settings.publicSettings();
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('platform/settings')
  @RequireScope('platform')
  @ApiCookieAuth('session')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getSiteSettings',
    summary: '查询站点配置及版本',
  })
  @ApiOkResponse({ type: SiteSettingsResponseDto })
  get(): Promise<SiteSettingsResponseDto> {
    return this.settings.get();
  }

  @AuditEndpoint({ event: 'settings.update', name: '修改系统配置' })
  @Patch('platform/settings')
  @RequireScope('platform')
  @ApiCookieAuth('session')
  @ApiOperation({
    operationId: 'updateSiteSettings',
    summary: '更新站点配置并记录变更',
  })
  @ApiBody({ type: UpdateSiteSettingsDto })
  @ApiOkResponse({ type: SiteSettingsResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Body() body: UpdateSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    return this.settings.update(session, body);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('platform/settings/history')
  @RequireScope('platform')
  @ApiCookieAuth('session')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listSiteSettingsHistory',
    summary: '分页查询配置变更记录',
  })
  @ApiOkResponse({ type: SiteSettingsAuditListResponseDto })
  history(
    @Query() query: PaginationQueryDto,
  ): Promise<SiteSettingsAuditListResponseDto> {
    return this.settings.history(query);
  }
}
