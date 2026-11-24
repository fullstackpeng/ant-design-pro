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
import { AssistantService } from './assistant.service.js';
import {
  CreateAiAssistantDto,
  UpdateAiAssistantDto,
} from './dto/assistant-request.dto.js';
import { AiAssistantListResponse } from './dto/assistant-response.dto.js';

@Controller('api/platform/ai/assistants')
@RequireScope('platform')
@ApiTags('ai-admin')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PaginationQueryDto)
export class AiAssistantAdminController {
  constructor(
    @Inject(AssistantService) private readonly service: AssistantService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: 'AI 业务配置及授权查询' })
  @ApiOperation({
    operationId: 'listAiAssistants',
    summary: '查询 AI 助手',
  })
  @ApiOkResponse({ type: AiAssistantListResponse })
  list(@Query() query: PaginationQueryDto): Promise<AiAssistantListResponse> {
    return this.service.list(query);
  }

  @Post()
  @AuditEndpoint({
    event: 'ai.assistant.create',
    name: '创建 AI 助手',
  })
  @ApiOperation({
    operationId: 'createAiAssistant',
    summary: '创建 AI 助手',
  })
  @ApiBody({ type: CreateAiAssistantDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(@Body() body: CreateAiAssistantDto): Promise<EmptyResponseDto> {
    return this.service.create(body);
  }

  @Patch(':id')
  @AuditEndpoint({
    event: 'ai.assistant.update',
    name: '修改 AI 助手',
  })
  @ApiOperation({
    operationId: 'updateAiAssistant',
    summary: '修改 AI 助手',
  })
  @ApiBody({ type: UpdateAiAssistantDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateAiAssistantDto,
  ): Promise<EmptyResponseDto> {
    return this.service.update(params.id, body);
  }

  @Delete(':id')
  @AuditEndpoint({
    event: 'ai.assistant.delete',
    name: '删除 AI 助手',
  })
  @ApiOperation({
    operationId: 'deleteAiAssistant',
    summary: '删除 AI 助手',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  delete(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.service.delete(params.id);
  }
}
