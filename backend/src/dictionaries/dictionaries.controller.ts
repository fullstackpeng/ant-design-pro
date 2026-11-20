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
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
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
)
export class DictionariesController {
  constructor(
    @Inject(DictionariesService)
    private readonly dictionaries: DictionariesService,
  ) {}

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

  // Reading options is available to all members of a tenant with the feature enabled.
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
