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
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import { DepartmentsService } from './departments.service.js';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department-request.dto.js';
import { DepartmentListResponseDto } from './dto/department-response.dto.js';

@Controller('api/tenant/departments')
@RequireScope('tenant')
@RequireFeature('members')
@ApiTags('departments')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto)
export class DepartmentsController {
  constructor(
    @Inject(DepartmentsService) private readonly service: DepartmentsService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @RequirePermission('departments:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listDepartments', summary: '查询当前租户部门' })
  @ApiOkResponse({ type: DepartmentListResponseDto })
  list(
    @CurrentSession() session: SessionContext,
  ): Promise<DepartmentListResponseDto> {
    return this.service.list(session);
  }

  @AuditEndpoint({ event: 'departments.create', name: '新增部门' })
  @Post()
  @RequirePermission('departments:create')
  @ApiOperation({ operationId: 'createDepartment', summary: '新增部门' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateDepartmentDto,
  ): Promise<EmptyResponseDto> {
    return this.service.create(session, body);
  }

  @AuditEndpoint({ event: 'departments.update', name: '修改部门' })
  @Patch(':id')
  @RequirePermission('departments:update')
  @ApiOperation({ operationId: 'updateDepartment', summary: '编辑部门' })
  @ApiBody({ type: UpdateDepartmentDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdateDepartmentDto,
  ): Promise<EmptyResponseDto> {
    return this.service.update(session, params.id, body);
  }

  @AuditEndpoint({ event: 'departments.delete', name: '删除部门' })
  @Delete(':id')
  @RequirePermission('departments:delete')
  @ApiOperation({
    operationId: 'deleteDepartment',
    summary: '删除未使用的部门',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.service.remove(session, params.id);
  }
}
