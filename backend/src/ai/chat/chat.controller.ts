import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../../audit/audit-action.js';
import { RequireScope } from '../../auth/access-scope.decorator.js';
import { CurrentSession } from '../../auth/current-session.decorator.js';
import { RequireFeature } from '../../auth/require-feature.decorator.js';
import { RequirePermission } from '../../auth/require-permission.decorator.js';
import type { SessionContext } from '../../auth/session-context.js';
import {
  IdParamDto,
  PaginationQueryDto,
} from '../../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../../common/dto/response.dto.js';
import { AssistantService } from '../assistant/assistant.service.js';
import { ConversationsService } from '../conversation/conversations.service.js';
import { AiConversationListResponse } from '../conversation/dto/conversation-response.dto.js';
import { KnowledgeAccessService } from '../knowledge/knowledge-access.service.js';
import { AiOrchestratorService } from './ai-orchestrator.service.js';
import { AiChatRequestDto } from './dto/chat-request.dto.js';
import {
  AiAccessibleAssistantListResponse,
  AiChatResponse,
  AiMessageListResponse,
} from './dto/chat-response.dto.js';

@Controller('api/ai')
@RequireScope('tenant')
@RequireFeature('chatbot')
@RequirePermission('chatbot:view')
@ApiTags('ai')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PaginationQueryDto)
export class AiChatController {
  constructor(
    @Inject(AiOrchestratorService)
    private readonly chatService: AiOrchestratorService,
    @Inject(KnowledgeAccessService)
    private readonly access: KnowledgeAccessService,
    @Inject(AssistantService) private readonly assistants: AssistantService,
    @Inject(ConversationsService)
    private readonly conversations: ConversationsService,
  ) {}

  @Get('assistants')
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: '查询当前用户可访问助手，无业务变更' })
  @ApiOperation({
    operationId: 'listAccessibleAiAssistants',
    summary: '查询可访问 AI 助手',
  })
  @ApiOkResponse({ type: AiAccessibleAssistantListResponse })
  async listAssistants(
    @CurrentSession() session: SessionContext,
  ): Promise<AiAccessibleAssistantListResponse> {
    return this.assistants.accessible(await this.access.context(session));
  }

  @Post('chat')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  @AuditEndpoint({ event: 'ai.chat', name: 'AI 操作问答' })
  @ApiOperation({ operationId: 'askAi', summary: '授权操作指南问答' })
  @ApiBody({ type: AiChatRequestDto })
  @ApiOkResponse({ type: AiChatResponse })
  @Header('X-Content-Type-Options', 'nosniff')
  async chat(
    @CurrentSession() session: SessionContext,
    @Body() body: AiChatRequestDto,
  ): Promise<AiChatResponse> {
    return this.chatService.chat(session, body);
  }

  @Get('conversations')
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: '查询本人会话元数据，无业务变更' })
  @ApiOperation({
    operationId: 'listAiConversations',
    summary: '查询本人会话',
  })
  @ApiOkResponse({ type: AiConversationListResponse })
  async list(
    @CurrentSession() session: SessionContext,
    @Query() query: PaginationQueryDto,
  ): Promise<AiConversationListResponse> {
    return this.conversations.list(await this.access.context(session), query);
  }

  @Get('conversations/:id/messages')
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: '本人会话读取，按当前知识权限重新校验' })
  @ApiOperation({
    operationId: 'listAiMessages',
    summary: '查询本人消息',
  })
  @ApiOkResponse({ type: AiMessageListResponse })
  async messages(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Query() query: PaginationQueryDto,
  ): Promise<AiMessageListResponse> {
    return this.conversations.messages(
      await this.access.context(session),
      params.id,
      query,
    );
  }

  @Delete('conversations/:id')
  @AuditEndpoint({
    event: 'ai.conversation.delete',
    name: '删除 AI 自己的会话',
  })
  @ApiOperation({
    operationId: 'deleteAiConversation',
    summary: '删除本人会话',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  async delete(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.conversations.delete(
      await this.access.context(session),
      params.id,
    );
  }
}
