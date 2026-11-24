import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
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
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors } from '../common/dto/response.dto.js';
import { AuditService } from './audit.service.js';
import { AuditEndpoint } from './audit-action.js';
import {
  AuditQueryDto,
  UpdateAuditPolicyDto,
} from './dto/audit-request.dto.js';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
  AuditPolicyResponseDto,
} from './dto/audit-response.dto.js';

@Controller('api/platform/audit')
@RequireScope('platform')
@ApiTags('audit')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(AuditQueryDto, IdParamDto)
export class PlatformAuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get('operation-logs')
  @AuditEndpoint({ exempt: '审计日志只读查询' })

  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPlatformOperationLogs',
    summary: '分页查询平台及租户操作日志',
  })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listOperation(
    @CurrentSession() session: SessionContext,
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.audit.list(session, query, 'operation');
  }

  @Get('operation-logs/:id')
  @AuditEndpoint({ exempt: '审计日志只读查询' })

  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getPlatformOperationLog',
    summary: '查看平台及租户操作日志',
  })
  @ApiOkResponse({ type: AuditLogResponseDto })
  getOperation(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<AuditLogResponseDto> {
    return this.audit.detail(session, params.id, 'operation');
  }

  @Get('login-logs')
  @AuditEndpoint({ exempt: '审计日志只读查询' })

  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPlatformLoginLogs',
    summary: '分页查询平台及租户登录日志',
  })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listLogin(
    @CurrentSession() session: SessionContext,
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.audit.list(session, query, 'login');
  }

  @Get('login-logs/:id')
  @AuditEndpoint({ exempt: '审计日志只读查询' })

  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getPlatformLoginLog',
    summary: '查看平台及租户登录日志',
  })
  @ApiOkResponse({ type: AuditLogResponseDto })
  getLogin(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<AuditLogResponseDto> {
    return this.audit.detail(session, params.id, 'login');
  }

  @Get('policy')
  @AuditEndpoint({ exempt: '查看生效的日志保留策略' })

  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getPlatformAuditPolicy',
    summary: '查看日志保留策略',
  })
  @ApiOkResponse({ type: AuditPolicyResponseDto })
  policy(): Promise<AuditPolicyResponseDto> {
    return this.audit.policy();
  }

  @Patch('policy')
  @AuditEndpoint({ event: 'audit.policy.update', name: '修改日志保留策略' })
  @ApiBody({ type: UpdateAuditPolicyDto })
  @ApiOperation({
    operationId: 'updateAuditPolicy',
    summary: '修改日志保留策略（缩短会清理历史记录）',
  })
  @ApiOkResponse({ type: AuditPolicyResponseDto })
  updatePolicy(
    @Body() body: UpdateAuditPolicyDto,
  ): Promise<AuditPolicyResponseDto> {
    return this.audit.updatePolicy(body);
  }
}

@Controller('api/tenant/audit')
@RequireScope('tenant')
@ApiTags('audit')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(AuditQueryDto, IdParamDto)
export class TenantAuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get('operation-logs')
  @AuditEndpoint({ exempt: '审计日志只读查询' })
  @RequireFeature('audit')
  @RequirePermission('audit:operation:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listTenantOperationLogs',
    summary: '分页查询当前租户操作日志',
  })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listOperation(
    @CurrentSession() session: SessionContext,
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.audit.list(session, query, 'operation');
  }

  @Get('operation-logs/:id')
  @AuditEndpoint({ exempt: '审计日志只读查询' })
  @RequireFeature('audit')
  @RequirePermission('audit:operation:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getTenantOperationLog',
    summary: '查看当前租户操作日志',
  })
  @ApiOkResponse({ type: AuditLogResponseDto })
  getOperation(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<AuditLogResponseDto> {
    return this.audit.detail(session, params.id, 'operation');
  }

  @Get('login-logs')
  @AuditEndpoint({ exempt: '审计日志只读查询' })
  @RequireFeature('audit')
  @RequirePermission('audit:login:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listTenantLoginLogs',
    summary: '分页查询当前租户登录日志',
  })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listLogin(
    @CurrentSession() session: SessionContext,
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.audit.list(session, query, 'login');
  }

  @Get('login-logs/:id')
  @AuditEndpoint({ exempt: '审计日志只读查询' })
  @RequireFeature('audit')
  @RequirePermission('audit:login:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getTenantLoginLog',
    summary: '查看当前租户登录日志',
  })
  @ApiOkResponse({ type: AuditLogResponseDto })
  getLogin(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<AuditLogResponseDto> {
    return this.audit.detail(session, params.id, 'login');
  }

  @Get('policy')
  @AuditEndpoint({ exempt: '查看生效的日志保留策略' })
  @RequireFeature('audit')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getTenantAuditPolicy',
    summary: '查看日志保留策略',
  })
  @ApiOkResponse({ type: AuditPolicyResponseDto })
  policy(): Promise<AuditPolicyResponseDto> {
    return this.audit.policy();
  }
}
