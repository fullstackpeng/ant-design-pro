import {
  Body,
  Controller,
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
import { RequireScope } from '../auth/access-scope.decorator.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  CreateStorageProviderDto,
  UpdateStorageProviderDto,
} from './dto/storage-provider-request.dto.js';
import {
  StorageProtocolListResponseDto,
  StorageProviderListResponseDto,
} from './dto/storage-provider-response.dto.js';
import { StorageProvidersService } from './storage-providers.service.js';

@Controller('api/platform/storage')
@RequireScope('platform')
@ApiTags('storage')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto)
export class StorageController {
  constructor(
    @Inject(StorageProvidersService)
    private readonly providers: StorageProvidersService,
  ) {}

  @Get('protocols')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listStorageProtocols',
    summary: '查询已支持的存储协议及字段定义',
  })
  @ApiOkResponse({ type: StorageProtocolListResponseDto })
  protocols(): StorageProtocolListResponseDto {
    return this.providers.protocolsMeta();
  }

  @Get('providers')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listStorageProviders',
    summary: '查询存储服务商，不返回密钥值',
  })
  @ApiOkResponse({ type: StorageProviderListResponseDto })
  list(): Promise<StorageProviderListResponseDto> {
    return this.providers.list();
  }

  @Post('providers')
  @ApiOperation({ operationId: 'createStorageProvider', summary: '新增服务商' })
  @ApiBody({ type: CreateStorageProviderDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(@Body() body: CreateStorageProviderDto): Promise<EmptyResponseDto> {
    return this.providers.create(body);
  }

  @Patch('providers/:id')
  @ApiOperation({ operationId: 'updateStorageProvider', summary: '修改服务商' })
  @ApiBody({ type: UpdateStorageProviderDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateStorageProviderDto,
  ): Promise<EmptyResponseDto> {
    return this.providers.update(params.id, body);
  }

  @Post('providers/:id/default')
  @ApiOperation({
    operationId: 'setDefaultStorageProvider',
    summary: '设为全局默认服务商',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  setDefault(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.providers.setDefault(params.id);
  }

  @Post('providers/:id/test')
  @ApiOperation({
    operationId: 'testStorageProvider',
    summary: '测试服务商连接',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  test(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.providers.test(params.id);
  }
}
