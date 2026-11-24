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
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { PaginationQueryDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import { DictionariesService } from './dictionaries.service.js';
import {
  CreateDictionaryDto,
  CreateDictionaryItemDto,
  DictionaryCodeParamDto,
  DictionaryItemParamDto,
  DictionaryQueryDto,
  UpdateDictionaryDto,
  UpdateDictionaryItemDto,
} from './dto/dictionary-request.dto.js';
import {
  DictionaryAuditListResponseDto,
  DictionaryDetailResponseDto,
  DictionaryListResponseDto,
} from './dto/dictionary-response.dto.js';

@Controller('api/tenant/dictionaries')
@RequireScope('tenant')
@RequireFeature('dictionaries')
@ApiTags('dictionaries')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(
  DictionaryCodeParamDto,
  DictionaryItemParamDto,
  DictionaryQueryDto,
  PaginationQueryDto,
)
export class DictionariesController {
  constructor(
    @Inject(DictionariesService)
    private readonly dictionaries: DictionariesService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @RequirePermission('dictionaries:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listDictionaries',
    summary: '查询当前租户字典类型',
  })
  @ApiOkResponse({ type: DictionaryListResponseDto })
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: DictionaryQueryDto,
  ): Promise<DictionaryListResponseDto> {
    return this.dictionaries.list(session, query);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get(':code/history')
  @RequirePermission('dictionaries:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listDictionaryHistory',
    summary: '查询本租户字典变更记录',
  })
  @ApiOkResponse({ type: DictionaryAuditListResponseDto })
  history(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryCodeParamDto,
    @Query() query: PaginationQueryDto,
  ): Promise<DictionaryAuditListResponseDto> {
    return this.dictionaries.history(
      session,
      { scope: 'tenant', code: params.code },
      query,
    );
  }

  // Reading options is available to all members of a tenant with the feature enabled.
  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get(':code')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getDictionary',
    summary: '读取字典及历史选项，停用项只用于展示',
  })
  @ApiOkResponse({ type: DictionaryDetailResponseDto })
  detail(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryCodeParamDto,
  ): Promise<DictionaryDetailResponseDto> {
    return this.dictionaries.detail(session, params.code);
  }

  @AuditEndpoint({ event: 'dictionaries.create', name: '创建字典' })
  @Post()
  @RequirePermission('dictionaries:create')
  @ApiOperation({ operationId: 'createDictionary', summary: '创建字典类型' })
  @ApiBody({ type: CreateDictionaryDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateDictionaryDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.create(session, body);
  }

  @AuditEndpoint({ event: 'dictionaries.update', name: '修改字典' })
  @Patch(':code')
  @RequirePermission('dictionaries:update')
  @ApiOperation({
    operationId: 'updateDictionary',
    summary: '修改字典类型，编码不可修改',
  })
  @ApiBody({ type: UpdateDictionaryDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryCodeParamDto,
    @Body() body: UpdateDictionaryDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.update(session, params.code, body);
  }

  @AuditEndpoint({ event: 'dictionaries.items.create', name: '新增字典项' })
  @Post(':code/items')
  @RequirePermission('dictionaries:create')
  @ApiOperation({ operationId: 'createDictionaryItem', summary: '创建字典项' })
  @ApiBody({ type: CreateDictionaryItemDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  createItem(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryCodeParamDto,
    @Body() body: CreateDictionaryItemDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.createItem(session, params.code, body);
  }

  @AuditEndpoint({ event: 'dictionaries.items.update', name: '修改字典项' })
  @Patch(':code/items/:id')
  @RequirePermission('dictionaries:update')
  @ApiOperation({
    operationId: 'updateDictionaryItem',
    summary: '修改字典项，值不可修改',
  })
  @ApiBody({ type: UpdateDictionaryItemDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  updateItem(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryItemParamDto,
    @Body() body: UpdateDictionaryItemDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.updateItem(session, params.code, params.id, body);
  }
}
