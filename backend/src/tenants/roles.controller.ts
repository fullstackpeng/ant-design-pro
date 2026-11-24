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
import { CreateRoleDto, UpdateRoleDto } from './dto/role-request.dto.js';
import {
  PermissionListResponseDto,
  RoleListResponseDto,
} from './dto/role-response.dto.js';
import { RolesService } from './roles.service.js';
@Controller('api/tenant')
@RequireScope('tenant-admin')
@ApiTags('roles')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto)
export class RolesController {
  constructor(@Inject(RolesService) private readonly roles: RolesService) {}
  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('roles')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listRoles', summary: '查询当前租户角色' })
  @ApiOkResponse({ type: RoleListResponseDto })
  list(
    @CurrentSession() session: SessionContext,
  ): Promise<RoleListResponseDto> {
    return this.roles.list(session);
  }
  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('permissions')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPermissions',
    summary: '查询当前租户可分配权限',
  })
  @ApiOkResponse({ type: PermissionListResponseDto })
  catalog(
    @CurrentSession() session: SessionContext,
  ): Promise<PermissionListResponseDto> {
    return this.roles.catalog(session);
  }
  @AuditEndpoint({ event: 'roles.create', name: '新增角色' })
  @Post('roles')
  @ApiOperation({ operationId: 'createRole', summary: '创建租户角色' })
  @ApiBody({ type: CreateRoleDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateRoleDto,
  ): Promise<EmptyResponseDto> {
    return this.roles.create(session, body);
  }
  @AuditEndpoint({ event: 'roles.update', name: '修改角色权限' })
  @Patch('roles/:id')
  @ApiOperation({ operationId: 'updateRole', summary: '修改租户角色与权限' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdateRoleDto,
  ): Promise<EmptyResponseDto> {
    return this.roles.update(session, params.id, body);
  }
  @AuditEndpoint({ event: 'roles.delete', name: '删除角色' })
  @Delete('roles/:id')
  @ApiOperation({ operationId: 'deleteRole', summary: '删除未分配的租户角色' })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.roles.remove(session, params.id);
  }
}
