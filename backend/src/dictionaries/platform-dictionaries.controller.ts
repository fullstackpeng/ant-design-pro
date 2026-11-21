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
} from './dto/dictionary-request.dto.js';
import { DictionaryAuditListResponseDto } from './dto/dictionary-response.dto.js';
import {
  UpdatePlatformDictionaryDto,
  UpdatePlatformDictionaryItemDto,
} from './dto/platform-dictionary-request.dto.js';
import {
  PlatformDictionaryDetailResponseDto,
  PlatformDictionaryListResponseDto,
} from './dto/platform-dictionary-response.dto.js';
import { PlatformDictionariesService } from './platform-dictionaries.service.js';

@Controller('api/platform/dictionaries')
@RequireScope('platform')
@ApiTags('platformDictionaries')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(
  DictionaryCodeParamDto,
  DictionaryItemParamDto,
  DictionaryQueryDto,
  PaginationQueryDto,
)
export class PlatformDictionariesController {
  constructor(
    @Inject(PlatformDictionariesService)
    private readonly dictionaries: PlatformDictionariesService,
    @Inject(DictionariesService)
    private readonly historyService: DictionariesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPlatformDictionaries',
    summary: '分页查询平台字典类型',
  })
  @ApiOkResponse({ type: PlatformDictionaryListResponseDto })
  list(
    @Query() query: DictionaryQueryDto,
  ): Promise<PlatformDictionaryListResponseDto> {
    return this.dictionaries.list(query);
  }

  @Get(':code/history')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPlatformDictionaryHistory',
    summary: '查询平台字典变更记录',
  })
  @ApiOkResponse({ type: DictionaryAuditListResponseDto })
  history(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryCodeParamDto,
    @Query() query: PaginationQueryDto,
  ): Promise<DictionaryAuditListResponseDto> {
    return this.historyService.history(
      session,
      { scope: 'platform', code: params.code },
      query,
    );
  }

  @Post()
  @ApiOperation({
    operationId: 'createPlatformDictionary',
    summary: '创建平台共享字典类型',
  })
  @ApiBody({ type: CreateDictionaryDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateDictionaryDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.create(session, body);
  }

  @Patch(':code')
  @ApiOperation({
    operationId: 'updatePlatformDictionary',
    summary: '修改平台字典并记录审计，版本过期返回409',
  })
  @ApiBody({ type: UpdatePlatformDictionaryDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryCodeParamDto,
    @Body() body: UpdatePlatformDictionaryDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.update(session, params.code, body);
  }

  @Post(':code/items')
  @ApiOperation({
    operationId: 'createPlatformDictionaryItem',
    summary: '创建平台字典项',
  })
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
  @ApiOperation({
    operationId: 'updatePlatformDictionaryItem',
    summary: '修改平台字典项并记录审计，版本过期返回409',
  })
  @ApiBody({ type: UpdatePlatformDictionaryItemDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  updateItem(
    @CurrentSession() session: SessionContext,
    @Param() params: DictionaryItemParamDto,
    @Body() body: UpdatePlatformDictionaryItemDto,
  ): Promise<EmptyResponseDto> {
    return this.dictionaries.updateItem(session, params.code, params.id, body);
  }
}

@Controller('api/dictionaries/platform')
@RequireScope('authenticated')
@ApiTags('platformDictionaries')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(DictionaryCodeParamDto)
export class PlatformDictionaryLookupController {
  constructor(
    @Inject(PlatformDictionariesService)
    private readonly dictionaries: PlatformDictionariesService,
  ) {}

  @Get(':code')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getPlatformDictionary',
    summary:
      '已登录用户只读平台字典，不依赖租户字典功能；包含停用项用于历史展示',
  })
  @ApiOkResponse({ type: PlatformDictionaryDetailResponseDto })
  detail(
    @Param() params: DictionaryCodeParamDto,
  ): Promise<PlatformDictionaryDetailResponseDto> {
    return this.dictionaries.detail(params.code);
  }
}
