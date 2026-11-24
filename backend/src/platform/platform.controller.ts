import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
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
import type { SessionContext } from '../auth/session-context.js';
import {
  IdParamDto,
  PaginationQueryDto,
  TenantQueryDto,
} from '../common/dto/request.dto.js';
import { ApiErrors } from '../common/dto/response.dto.js';
import {
  AssignPlanDto,
  CreatePlanDto,
  CreateTenantDto,
  UpdatePlanDto,
  UpdateTenantDto,
} from './dto/platform-request.dto.js';
import {
  PlanListResponseDto,
  PlanResponseDto,
  SubscriptionResponseDto,
  TenantListResponseDto,
  TenantResponseDto,
} from './dto/platform-response.dto.js';
import { PlatformService } from './platform.service.js';

@Controller('api/platform')
@RequireScope('platform')
@ApiTags('platform')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PaginationQueryDto, TenantQueryDto)
export class PlatformController {
  constructor(
    @Inject(PlatformService) private readonly platform: PlatformService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('tenants')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listTenants', summary: '分页查询租户' })
  @ApiOkResponse({ type: TenantListResponseDto })
  tenants(@Query() query: TenantQueryDto): Promise<TenantListResponseDto> {
    return this.platform.tenants(query);
  }

  @AuditEndpoint({ event: 'tenants.create', name: '创建租户' })
  @Post('tenants')
  @ApiOperation({
    operationId: 'createTenant',
    summary: '创建租户及首位管理员',
  })
  @ApiBody({ type: CreateTenantDto })
  @ApiCreatedResponse({ type: TenantResponseDto })
  createTenant(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.platform.createTenant(session, body);
  }

  @AuditEndpoint({ event: 'tenants.update', name: '修改租户' })
  @Patch('tenants/:id')
  @ApiOperation({
    operationId: 'updateTenant',
    summary: '修改租户名称、行业与状态',
  })
  @ApiBody({ type: UpdateTenantDto })
  @ApiOkResponse({ type: TenantResponseDto })
  updateTenant(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.platform.updateTenant(session, params.id, body);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('plans')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listPlans', summary: '分页查询套餐' })
  @ApiOkResponse({ type: PlanListResponseDto })
  plans(@Query() query: PaginationQueryDto): Promise<PlanListResponseDto> {
    return this.platform.plans(query);
  }

  @AuditEndpoint({ event: 'plans.create', name: '创建套餐' })
  @Post('plans')
  @ApiOperation({ operationId: 'createPlan', summary: '创建套餐' })
  @ApiBody({ type: CreatePlanDto })
  @ApiCreatedResponse({ type: PlanResponseDto })
  createPlan(@Body() body: CreatePlanDto): Promise<PlanResponseDto> {
    return this.platform.createPlan(body);
  }

  @AuditEndpoint({ event: 'plans.update', name: '修改套餐' })
  @Patch('plans/:id')
  @ApiOperation({ operationId: 'updatePlan', summary: '修改套餐与成员上限' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiOkResponse({ type: PlanResponseDto })
  updatePlan(
    @Param() params: IdParamDto,
    @Body() body: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.platform.updatePlan(params.id, body);
  }

  @AuditEndpoint({ event: 'subscriptions.assign', name: '分配租户订阅' })
  @Post('tenants/:id/subscription')
  @ApiOperation({
    operationId: 'assignPlan',
    summary: '人工分配或更新租户订阅',
  })
  @ApiBody({ type: AssignPlanDto })
  @ApiCreatedResponse({ type: SubscriptionResponseDto })
  assign(
    @Param() params: IdParamDto,
    @Body() body: AssignPlanDto,
  ): Promise<SubscriptionResponseDto> {
    return this.platform.assign(params.id, body);
  }
}
