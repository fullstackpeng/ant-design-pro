import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../auth/authorization.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AssistantService } from './assistant/assistant.service.js';
import { AiAssistantAdminController } from './assistant/assistant-admin.controller.js';
import { AiOrchestratorService } from './chat/ai-orchestrator.service.js';
import { AiChatController } from './chat/chat.controller.js';
import { ConversationsService } from './conversation/conversations.service.js';
import { AiPolicyController } from './conversation/policy.controller.js';
import { AiRetentionModule } from './conversation/retention.module.js';
import { DocumentsService } from './knowledge/documents.service.js';
import { AiDocumentAdminController } from './knowledge/documents-admin.controller.js';
import { KnowledgeAccessService } from './knowledge/knowledge-access.service.js';
import { KnowledgeBasesService } from './knowledge/knowledge-bases.service.js';
import { AiKnowledgeBaseAdminController } from './knowledge/knowledge-bases-admin.controller.js';
import { AiOptionsController } from './knowledge/options.controller.js';
import { AuthorizedKnowledgeQuery } from './retrieval/authorized-knowledge.query.js';
import { ExactStrategy } from './retrieval/exact.strategy.js';
import { KeywordStrategy } from './retrieval/keyword.strategy.js';
import { RetrievalRegistry } from './retrieval/retrieval.registry.js';
import { SelectionStrategy } from './retrieval/selection.strategy.js';

@Module({
  imports: [DatabaseModule, AuthorizationModule, AiRetentionModule],
  controllers: [
    AiOptionsController,
    AiAssistantAdminController,
    AiKnowledgeBaseAdminController,
    AiDocumentAdminController,
    AiChatController,
    AiPolicyController,
  ],
  providers: [
    AssistantService,
    KnowledgeAccessService,
    KnowledgeBasesService,
    DocumentsService,
    AuthorizedKnowledgeQuery,
    ExactStrategy,
    KeywordStrategy,
    RetrievalRegistry,
    SelectionStrategy,
    ConversationsService,
    AiOrchestratorService,
  ],
})
export class AiModule {}
