import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
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
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  AssignFeaturesDto,
  CreateMenuDto,
  FeatureListResponseDto,
  MenuCodeParamDto,
  MenuListResponseDto,
  NavigationResponseDto,
  RegisteredPageListResponseDto,
  TenantFeaturesResponseDto,
  UpdateMenuDto,
} from './navigation.dto.js';
import { NavigationService } from './navigation.service.js';

@Controller('api')
@ApiTags('navigation')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, MenuCodeParamDto)
export class NavigationController {
  constructor(
    @Inject(NavigationService) private readonly navigation: NavigationService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('current/navigation')
  @RequireScope('authenticated')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'currentNavigation',
    summary: '获取当前身份的菜单和页面权限',
  })
  @ApiOkResponse({ type: NavigationResponseDto })
  async current(
    @CurrentSession() session: SessionContext,
  ): Promise<NavigationResponseDto> {
    return { success: true, data: await this.navigation.current(session) };
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('platform/features')
  @RequireScope('platform')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listFeatures', summary: '查询可分配功能目录' })
  @ApiOkResponse({ type: FeatureListResponseDto })
  async features(): Promise<FeatureListResponseDto> {
    return { success: true, data: await this.navigation.features() };
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('platform/menus')
  @RequireScope('platform')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listMenus', summary: '查询持久化菜单目录' })
  @ApiOkResponse({ type: MenuListResponseDto })
  async menus(): Promise<MenuListResponseDto> {
    return { success: true, data: await this.navigation.menus() };
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('platform/pages')
  @RequireScope('platform')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listRegisteredPages',
    summary: '查询代码注册的页面与模块权限',
  })
  @ApiOkResponse({ type: RegisteredPageListResponseDto })
  pages(): RegisteredPageListResponseDto {
    return { success: true, data: this.navigation.pages() };
  }

  @AuditEndpoint({ event: 'menus.create', name: '创建菜单' })
  @Post('platform/menus')
  @RequireScope('platform')
  @ApiOperation({
    operationId: 'createMenu',
    summary: '新增目录或已注册页面菜单',
  })
  @ApiBody({ type: CreateMenuDto })
  @ApiCreatedResponse({ type: MenuListResponseDto })
  async create(@Body() body: CreateMenuDto): Promise<MenuListResponseDto> {
    return { success: true, data: [await this.navigation.createMenu(body)] };
  }

  @AuditEndpoint({ event: 'menus.delete', name: '删除菜单' })
  @Delete('platform/menus/:code')
  @RequireScope('platform')
  @ApiOperation({
    operationId: 'deleteMenu',
    summary: '删除菜单入口，不撤销模块权限',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  async remove(@Param() params: MenuCodeParamDto): Promise<EmptyResponseDto> {
    await this.navigation.deleteMenu(params.code);
    return { success: true, data: null };
  }

  @AuditEndpoint({ event: 'menus.update', name: '修改菜单' })
  @Patch('platform/menus/:code')
  @RequireScope('platform')
  @ApiOperation({
    operationId: 'updateMenu',
    summary: '修改菜单名称、图标、排序和状态',
  })
  @ApiBody({ type: UpdateMenuDto })
  @ApiOkResponse({ type: MenuListResponseDto })
  async update(
    @Param() params: MenuCodeParamDto,
    @Body() body: UpdateMenuDto,
  ): Promise<MenuListResponseDto> {
    return {
      success: true,
      data: [await this.navigation.updateMenu(params.code, body)],
    };
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('platform/tenants/:id/features')
  @RequireScope('platform')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'tenantFeatures',
    summary: '查询租户已开通功能',
  })
  @ApiOkResponse({ type: TenantFeaturesResponseDto })
  async tenantFeatures(
    @Param() params: IdParamDto,
  ): Promise<TenantFeaturesResponseDto> {
    return {
      success: true,
      data: await this.navigation.tenantFeatures(params.id),
    };
  }

  @AuditEndpoint({ event: 'features.assign', name: '分配租户功能' })
  @Patch('platform/tenants/:id/features')
  @RequireScope('platform')
  @ApiOperation({
    operationId: 'assignTenantFeatures',
    summary: '替换租户开通功能，空数组撤销全部业务功能',
  })
  @ApiBody({ type: AssignFeaturesDto })
  @ApiOkResponse({ type: TenantFeaturesResponseDto })
  async assign(
    @Param() params: IdParamDto,
    @Body() body: AssignFeaturesDto,
  ): Promise<TenantFeaturesResponseDto> {
    return {
      success: true,
      data: await this.navigation.assignFeatures(params.id, body.featureCodes),
    };
  }
}
