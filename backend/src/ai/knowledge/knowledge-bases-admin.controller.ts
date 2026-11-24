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
import {
  CreateAiKnowledgeBaseDto,
  UpdateAiKnowledgeBaseDto,
} from './dto/knowledge-base-request.dto.js';
import { AiKnowledgeBaseListResponse } from './dto/knowledge-base-response.dto.js';
import { KnowledgeBasesService } from './knowledge-bases.service.js';

@Controller('api/platform/ai/knowledge-bases')
@RequireScope('platform')
@ApiTags('ai-admin')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PaginationQueryDto)
export class AiKnowledgeBaseAdminController {
  constructor(
    @Inject(KnowledgeBasesService)
    private readonly service: KnowledgeBasesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: 'AI 业务配置及授权查询' })
  @ApiOperation({
    operationId: 'listAiKnowledgeBases',
    summary: '查询 AI 知识库',
  })
  @ApiOkResponse({ type: AiKnowledgeBaseListResponse })
  list(
    @Query() query: PaginationQueryDto,
  ): Promise<AiKnowledgeBaseListResponse> {
    return this.service.list(query);
  }

  @Post()
  @AuditEndpoint({
    event: 'ai.knowledge-base.create',
    name: '创建 AI 知识库',
  })
  @ApiOperation({
    operationId: 'createAiKnowledgeBase',
    summary: '创建 AI 知识库',
  })
  @ApiBody({ type: CreateAiKnowledgeBaseDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(@Body() body: CreateAiKnowledgeBaseDto): Promise<EmptyResponseDto> {
    return this.service.create(body);
  }

  @Patch(':id')
  @AuditEndpoint({
    event: 'ai.knowledge-base.update',
    name: '修改 AI 知识库',
  })
  @ApiOperation({
    operationId: 'updateAiKnowledgeBase',
    summary: '修改 AI 知识库',
  })
  @ApiBody({ type: UpdateAiKnowledgeBaseDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateAiKnowledgeBaseDto,
  ): Promise<EmptyResponseDto> {
    return this.service.update(params.id, body);
  }

  @Delete(':id')
  @AuditEndpoint({
    event: 'ai.knowledge-base.delete',
    name: '删除 AI 知识库',
  })
  @ApiOperation({
    operationId: 'deleteAiKnowledgeBase',
    summary: '删除 AI 知识库',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  delete(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.service.delete(params.id);
  }
}
