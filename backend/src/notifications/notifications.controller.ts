import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../audit/audit-action.js';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import { tenantId } from '../common/validation.js';
import {
  CreateNotificationDto,
  InboxQueryDto,
  NotificationQueryDto,
} from './dto/notification-request.dto.js';
import {
  NotificationDetailResponseDto,
  NotificationListResponseDto,
} from './dto/notification-response.dto.js';
import { NotificationsService } from './notifications.service.js';

const pageResponse = { type: NotificationListResponseDto };
const detailResponse = { type: NotificationDetailResponseDto };
const emptyResponse = { type: EmptyResponseDto };

@Controller('api/platform/notifications')
@RequireScope('platform')
@ApiTags('notifications')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, NotificationQueryDto, CreateNotificationDto)
export class PlatformNotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @ApiOperation({
    operationId: 'listPlatformNotifications',
    summary: '分页查询平台通知公告',
  })
  @ApiOkResponse(pageResponse)
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notifications.platformList(query, session);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get(':id')
  @ApiOperation({
    operationId: 'getPlatformNotification',
    summary: '查询平台通知公告详情',
  })
  @ApiOkResponse(detailResponse)
  detail(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ) {
    return this.notifications.platformDetail(params.id, session);
  }

  @AuditEndpoint({
    event: 'platform-notifications.create',
    name: '创建平台通知',
  })
  @Post()
  @ApiOperation({
    operationId: 'createPlatformNotification',
    summary: '新建平台通知公告',
  })
  @ApiCreatedResponse(emptyResponse)
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateNotificationDto,
  ) {
    return this.notifications.createPlatform(session, body);
  }

  @AuditEndpoint({
    event: 'platform-notifications.update',
    name: '修改平台通知',
  })
  @Patch(':id')
  @ApiOperation({
    operationId: 'updatePlatformNotification',
    summary: '编辑平台通知公告',
  })
  @ApiOkResponse(emptyResponse)
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: CreateNotificationDto,
  ) {
    return this.notifications.updatePlatform(session, params.id, body);
  }

  @AuditEndpoint({ event: 'notifications.delete', name: '删除通知' })
  @Delete(':id')
  @ApiOperation({
    operationId: 'deletePlatformNotification',
    summary: '删除平台通知公告',
  })
  @ApiOkResponse(emptyResponse)
  remove(@Param() params: IdParamDto) {
    return this.notifications.remove(params.id, 'platform', undefined);
  }
}

@Controller('api/tenant/notifications')
@RequireScope('tenant')
@RequireFeature('notifications')
@ApiTags('notifications')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, NotificationQueryDto, CreateNotificationDto)
export class TenantNotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @RequirePermission('notifications:read')
  @ApiOperation({
    operationId: 'listTenantNotifications',
    summary: '分页查询本租户通知公告',
  })
  @ApiOkResponse(pageResponse)
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notifications.tenantList(session, query);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get(':id')
  @RequirePermission('notifications:read')
  @ApiOperation({
    operationId: 'getTenantNotification',
    summary: '查询本租户通知公告详情',
  })
  @ApiOkResponse(detailResponse)
  detail(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ) {
    return this.notifications.tenantDetail(session, params.id);
  }

  @AuditEndpoint({ event: 'notifications.create', name: '创建租户通知' })
  @Post()
  @RequirePermission('notifications:create')
  @ApiOperation({
    operationId: 'createTenantNotification',
    summary: '新建本租户通知公告',
  })
  @ApiCreatedResponse(emptyResponse)
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateNotificationDto,
  ) {
    return this.notifications.createTenant(session, body);
  }

  @AuditEndpoint({ event: 'notifications.update', name: '修改租户通知' })
  @Patch(':id')
  @RequirePermission('notifications:update')
  @ApiOperation({
    operationId: 'updateTenantNotification',
    summary: '编辑本租户通知公告',
  })
  @ApiOkResponse(emptyResponse)
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: CreateNotificationDto,
  ) {
    return this.notifications.updateTenant(session, params.id, body);
  }

  @AuditEndpoint({ event: 'notifications.delete', name: '删除通知' })
  @Delete(':id')
  @RequirePermission('notifications:delete')
  @ApiOperation({
    operationId: 'deleteTenantNotification',
    summary: '删除本租户通知公告',
  })
  @ApiOkResponse(emptyResponse)
  remove(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ) {
    return this.notifications.remove(params.id, 'tenant', tenantId(session));
  }
}

@Controller('api/message-center/inbox')
@RequireScope('tenant')
@RequireFeature('notifications')
@ApiTags('notifications')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, InboxQueryDto)
export class NotificationInboxController {
  constructor(
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @RequirePermission('notifications:inbox:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listInboxNotifications',
    summary: '分页查询我的消息',
  })
  @ApiOkResponse(pageResponse)
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: InboxQueryDto,
  ) {
    return this.notifications.inbox(session, query);
  }

  @AuditEndpoint({ event: 'inbox.read-all', name: '标记全部消息已读' })
  @Post('read-all')
  @HttpCode(200)
  @RequirePermission('notifications:inbox:read')
  @ApiOperation({
    operationId: 'readAllNotifications',
    summary: '全部标记为已读',
  })
  @ApiOkResponse(emptyResponse)
  readAll(@CurrentSession() session: SessionContext) {
    return this.notifications.markAllRead(session);
  }

  @AuditEndpoint({ event: 'inbox.read', name: '标记消息已读' })
  @Post(':id/read')
  @HttpCode(200)
  @RequirePermission('notifications:inbox:read')
  @ApiOperation({
    operationId: 'readNotification',
    summary: '将单条消息标记为已读',
  })
  @ApiOkResponse(emptyResponse)
  read(@CurrentSession() session: SessionContext, @Param() params: IdParamDto) {
    return this.notifications.markRead(session, params.id);
  }
}
