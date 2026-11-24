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
import { AuditEndpoint } from '../../audit/audit-action.js';
import { RequireScope } from '../../auth/access-scope.decorator.js';
import {
  IdParamDto,
  PaginationQueryDto,
} from '../../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../../common/dto/response.dto.js';
import { DocumentsService } from './documents.service.js';
import {
  CreateAiDocumentDto,
  UpdateAiDocumentDto,
} from './dto/document-request.dto.js';
import { AiDocumentListResponse } from './dto/document-response.dto.js';

@Controller('api/platform/ai/documents')
@RequireScope('platform')
@ApiTags('ai-admin')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PaginationQueryDto)
export class AiDocumentAdminController {
  constructor(
    @Inject(DocumentsService) private readonly service: DocumentsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: 'AI 业务配置及授权查询' })
  @ApiOperation({
    operationId: 'listAiDocuments',
    summary: '查询 AI 操作指南',
  })
  @ApiOkResponse({ type: AiDocumentListResponse })
  list(@Query() query: PaginationQueryDto): Promise<AiDocumentListResponse> {
    return this.service.list(query);
  }

  @Post()
  @AuditEndpoint({ event: 'ai.document.create', name: '创建 AI 操作指南' })
  @ApiOperation({
    operationId: 'createAiDocument',
    summary: '创建 AI 操作指南',
  })
  @ApiBody({ type: CreateAiDocumentDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(@Body() body: CreateAiDocumentDto): Promise<EmptyResponseDto> {
    return this.service.create(body);
  }

  @Patch(':id')
  @AuditEndpoint({ event: 'ai.document.update', name: '修改 AI 操作指南' })
  @ApiOperation({
    operationId: 'updateAiDocument',
    summary: '修改 AI 操作指南',
  })
  @ApiBody({ type: UpdateAiDocumentDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateAiDocumentDto,
  ): Promise<EmptyResponseDto> {
    return this.service.update(params.id, body);
  }

  @Delete(':id')
  @AuditEndpoint({ event: 'ai.document.delete', name: '删除 AI 操作指南' })
  @ApiOperation({
    operationId: 'deleteAiDocument',
    summary: '删除 AI 操作指南',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  delete(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.service.delete(params.id);
  }
}
