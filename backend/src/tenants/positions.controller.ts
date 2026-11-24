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
import {
  CreatePositionDto,
  UpdatePositionDto,
} from './dto/position-request.dto.js';
import { PositionListResponseDto } from './dto/position-response.dto.js';
import { PositionsService } from './positions.service.js';

@Controller('api/tenant/positions')
@RequireScope('tenant')
@RequireFeature('members')
@ApiTags('positions')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto)
export class PositionsController {
  constructor(
    @Inject(PositionsService) private readonly service: PositionsService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @RequirePermission('positions:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listPositions', summary: '查询当前租户岗位' })
  @ApiOkResponse({ type: PositionListResponseDto })
  list(
    @CurrentSession() session: SessionContext,
  ): Promise<PositionListResponseDto> {
    return this.service.list(session);
  }

  @AuditEndpoint({ event: 'positions.create', name: '新增岗位' })
  @Post()
  @RequirePermission('positions:create')
  @ApiOperation({ operationId: 'createPosition', summary: '新增岗位' })
  @ApiBody({ type: CreatePositionDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreatePositionDto,
  ): Promise<EmptyResponseDto> {
    return this.service.create(session, body);
  }

  @AuditEndpoint({ event: 'positions.update', name: '修改岗位' })
  @Patch(':id')
  @RequirePermission('positions:update')
  @ApiOperation({ operationId: 'updatePosition', summary: '编辑岗位' })
  @ApiBody({ type: UpdatePositionDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdatePositionDto,
  ): Promise<EmptyResponseDto> {
    return this.service.update(session, params.id, body);
  }

  @AuditEndpoint({ event: 'positions.delete', name: '删除岗位' })
  @Delete(':id')
  @RequirePermission('positions:delete')
  @ApiOperation({ operationId: 'deletePosition', summary: '删除未使用的岗位' })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.service.remove(session, params.id);
  }
}
