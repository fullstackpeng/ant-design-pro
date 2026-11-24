BEGIN;
-- CreateTable
CREATE TABLE "app_ai_knowledge_bases" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_ai_knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_knowledge_documents" (
    "id" BIGSERIAL NOT NULL,
    "knowledge_base_id" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "standard_questions" TEXT[],
    "normalized_questions" TEXT[],
    "synonyms" TEXT[],
    "keywords" TEXT[],
    "content" TEXT NOT NULL,
    "steps" TEXT[],
    "page_code" VARCHAR(64),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "permission_mode" VARCHAR(3) NOT NULL DEFAULT 'ALL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_ai_knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_knowledge_permissions" (
    "document_id" BIGINT NOT NULL,
    "permission_code" VARCHAR(120) NOT NULL,

    CONSTRAINT "app_ai_knowledge_permissions_pkey" PRIMARY KEY ("document_id","permission_code")
);

-- CreateTable
CREATE TABLE "app_ai_knowledge_chunks" (
    "id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "sequence" INTEGER NOT NULL,
    "content_version" INTEGER NOT NULL,

    CONSTRAINT "app_ai_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_assistants" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "permission_mode" VARCHAR(3) NOT NULL DEFAULT 'ALL',
    "publication_scope" VARCHAR(20) NOT NULL DEFAULT 'none',
    "prompt" TEXT NOT NULL DEFAULT '',
    "retrieval_config" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_ai_assistants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_assistant_permissions" (
    "assistant_id" BIGINT NOT NULL,
    "permission_code" VARCHAR(120) NOT NULL,

    CONSTRAINT "app_ai_assistant_permissions_pkey" PRIMARY KEY ("assistant_id","permission_code")
);

-- CreateTable
CREATE TABLE "app_ai_assistant_tenants" (
    "assistant_id" BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,

    CONSTRAINT "app_ai_assistant_tenants_pkey" PRIMARY KEY ("assistant_id","tenant_id")
);

-- CreateTable
CREATE TABLE "app_ai_assistant_knowledge_bases" (
    "assistant_id" BIGINT NOT NULL,
    "knowledge_base_id" BIGINT NOT NULL,

    CONSTRAINT "app_ai_assistant_knowledge_bases_pkey" PRIMARY KEY ("assistant_id","knowledge_base_id")
);

-- CreateTable
CREATE TABLE "app_ai_conversations" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "assistant_id" BIGINT NOT NULL,
    "title" VARCHAR(100) NOT NULL DEFAULT '新对话',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_messages" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "conversation_id" BIGINT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "request_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "source_refs" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_ai_policy" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "conversation_retention_days" INTEGER NOT NULL DEFAULT 90,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_ai_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_knowledge_bases_code_key" ON "app_ai_knowledge_bases"("code");

-- CreateIndex
CREATE INDEX "app_ai_knowledge_documents_knowledge_base_id_status_idx" ON "app_ai_knowledge_documents"("knowledge_base_id", "status");

-- CreateIndex
CREATE INDEX "app_ai_knowledge_documents_normalized_questions_idx" ON "app_ai_knowledge_documents" USING GIN ("normalized_questions");

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_knowledge_chunks_document_id_content_version_sequenc_key" ON "app_ai_knowledge_chunks"("document_id", "content_version", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_assistants_code_key" ON "app_ai_assistants"("code");

-- CreateIndex
CREATE INDEX "app_ai_conversations_tenant_id_user_id_updated_at_id_idx" ON "app_ai_conversations"("tenant_id", "user_id", "updated_at", "id");

-- CreateIndex
CREATE INDEX "app_ai_conversations_updated_at_id_idx" ON "app_ai_conversations"("updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_conversations_tenant_id_id_key" ON "app_ai_conversations"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_messages_conversation_id_sequence_key" ON "app_ai_messages"("conversation_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "app_ai_messages_request_id_role_key" ON "app_ai_messages"("request_id", "role");

-- AddForeignKey
ALTER TABLE "app_ai_knowledge_documents" ADD CONSTRAINT "app_ai_knowledge_documents_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "app_ai_knowledge_bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_knowledge_permissions" ADD CONSTRAINT "app_ai_knowledge_permissions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app_ai_knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_knowledge_chunks" ADD CONSTRAINT "app_ai_knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app_ai_knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_assistant_permissions" ADD CONSTRAINT "app_ai_assistant_permissions_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "app_ai_assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_assistant_tenants" ADD CONSTRAINT "app_ai_assistant_tenants_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "app_ai_assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_assistant_tenants" ADD CONSTRAINT "app_ai_assistant_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_assistant_knowledge_bases" ADD CONSTRAINT "app_ai_assistant_knowledge_bases_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "app_ai_assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_assistant_knowledge_bases" ADD CONSTRAINT "app_ai_assistant_knowledge_bases_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "app_ai_knowledge_bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_conversations" ADD CONSTRAINT "app_ai_conversations_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "app_tenant_memberships"("tenant_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_conversations" ADD CONSTRAINT "app_ai_conversations_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "app_ai_assistants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_ai_messages" ADD CONSTRAINT "app_ai_messages_tenant_id_conversation_id_fkey" FOREIGN KEY ("tenant_id", "conversation_id") REFERENCES "app_ai_conversations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE app_ai_knowledge_documents ADD CONSTRAINT ai_document_status CHECK (status IN ('draft','published','disabled')),
  ADD CONSTRAINT ai_document_acl CHECK (permission_mode IN ('ALL','ANY')),
  ADD CONSTRAINT ai_document_version CHECK (version >= 1 AND revision >= 0);
ALTER TABLE app_ai_assistants ADD CONSTRAINT ai_assistant_scope CHECK (publication_scope IN ('none','all','selected')),
  ADD CONSTRAINT ai_assistant_acl CHECK (permission_mode IN ('ALL','ANY'));
ALTER TABLE app_ai_policy ADD CONSTRAINT ai_policy_singleton CHECK (id=1),
  ADD CONSTRAINT ai_retention_bounds CHECK (conversation_retention_days BETWEEN 1 AND 3650);
ALTER TABLE app_ai_messages ADD CONSTRAINT ai_message_role CHECK (role IN ('user','assistant')),
  ADD CONSTRAINT ai_message_sequence CHECK (sequence >= 0);
INSERT INTO app_ai_policy (id,conversation_retention_days,revision) VALUES (1,90,0);

INSERT INTO app_menus (code,parent_code,kind,path,name,icon,sort_order,scope,min_role,is_active)
VALUES ('platform-ai',NULL,'directory',NULL,'AI 管理','',300,'platform','user',true),
 ('platform-ai-knowledge-bases','platform-ai','page','/platform/ai/knowledge-bases','知识库','',301,'platform','user',true),
 ('platform-ai-documents','platform-ai','page','/platform/ai/documents','操作指南','',302,'platform','user',true),
 ('platform-ai-assistants','platform-ai','page','/platform/ai/assistants','助手配置','',303,'platform','user',true),
 ('platform-ai-policy','platform-ai','page','/platform/ai/policy','会话保留','',304,'platform','user',true);
UPDATE app_features SET description='基于授权操作指南的 AI 问答',category='base',is_demo=false WHERE code='chatbot';

-- Draft content must be reviewed and published by a platform administrator.
INSERT INTO app_ai_knowledge_bases(code,name,description,is_active,updated_at)
VALUES ('system-guide','系统操作指南','平台统一维护，审核发布后供授权租户使用',true,CURRENT_TIMESTAMP);
INSERT INTO app_ai_assistants(code,name,is_active,is_public,publication_scope,retrieval_config,updated_at)
VALUES ('system-guide','系统操作助手',false,true,'none','{"exact":true,"keyword":true,"trigram":false,"vector":false,"topK":4}',CURRENT_TIMESTAMP);
INSERT INTO app_ai_assistant_knowledge_bases(assistant_id,knowledge_base_id)
SELECT a.id,k.id FROM app_ai_assistants a CROSS JOIN app_ai_knowledge_bases k WHERE a.code='system-guide' AND k.code='system-guide';

INSERT INTO app_ai_knowledge_documents
(knowledge_base_id,title,standard_questions,normalized_questions,synonyms,keywords,content,steps,page_code,status,is_public,permission_mode,updated_at)
SELECT k.id,v.title,ARRAY[v.question],ARRAY[v.question],v.synonyms,v.keywords,v.content,v.steps,v.page_code,'draft',false,'ALL',CURRENT_TIMESTAMP
FROM app_ai_knowledge_bases k CROSS JOIN (VALUES
('如何新增成员','如何新增成员',ARRAY['添加成员','邀请用户'],ARRAY['新增','成员'],'可新建账号或添加已有账号；角色分配受管理员权限约束。',ARRAY['打开租户成员管理页面。','点击新增，选择新建账号或已有账号并填写信息。','核对角色和组织信息，提交保存。'],'tenant-members'),
('如何编辑成员','如何编辑成员',ARRAY['修改成员'],ARRAY['编辑','成员'],'可调整成员启用状态及允许修改的组织信息，角色分配受管理员权限约束。',ARRAY['打开租户成员管理页面，找到目标成员。','点击编辑，调整允许修改的信息。','确认后保存。'],'tenant-members'),
('如何新增部门','如何新增部门',ARRAY['添加部门'],ARRAY['新增','部门'],'在当前租户维护部门，可选择上级部门。',ARRAY['打开部门管理页面。','点击新增，填写部门编码和名称，按需选择上级部门。','确认排序和启用状态后保存。'],'tenant-departments'),
('如何新增岗位','如何新增岗位',ARRAY['添加岗位'],ARRAY['新增','岗位'],'岗位用于组织成员的岗位归属。',ARRAY['打开岗位管理页面。','点击新增，填写岗位编码和名称。','确认排序和启用状态后保存。'],'tenant-positions'),
('如何上传文件','如何上传文件',ARRAY['添加文件'],ARRAY['上传','文件'],'文件上传受租户存储空间及文件大小限制。',ARRAY['打开文件管理页面。','点击上传文件并选择本地文件。','等待上传完成后，在文件列表确认结果。'],'files')
) AS v(title,question,synonyms,keywords,content,steps,page_code)
WHERE k.code='system-guide';
INSERT INTO app_ai_knowledge_permissions(document_id,permission_code)
SELECT d.id,CASE d.title WHEN '如何新增成员' THEN 'members:create' WHEN '如何编辑成员' THEN 'members:update' WHEN '如何新增部门' THEN 'departments:create' WHEN '如何新增岗位' THEN 'positions:create' WHEN '如何上传文件' THEN 'files:create' END
FROM app_ai_knowledge_documents d JOIN app_ai_knowledge_bases k ON k.id=d.knowledge_base_id WHERE k.code='system-guide';
INSERT INTO app_ai_knowledge_chunks(document_id,content,keywords,sequence,content_version)
SELECT d.id,d.content || E'\n' || array_to_string(d.steps,E'\n'),d.keywords,0,1
FROM app_ai_knowledge_documents d JOIN app_ai_knowledge_bases k ON k.id=d.knowledge_base_id WHERE k.code='system-guide';

COMMIT;
