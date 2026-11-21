-- CreateTable
CREATE TABLE "app_scheduled_tasks" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'internal',
    "handler" VARCHAR(100) NOT NULL,
    "cron" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "tenant_ids" TEXT[],
    "params" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timeout_ms" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "synced_revision" INTEGER NOT NULL DEFAULT 0,
    "sync_error" VARCHAR(2000) NOT NULL DEFAULT '',
    "sync_token" TEXT,
    "sync_until" TIMESTAMPTZ(6),
    "execution_fence" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_scheduled_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_task_dispatches" (
    "id" TEXT NOT NULL,
    "task_id" BIGINT NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_task_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_task_runs" (
    "id" TEXT NOT NULL,
    "task_id" BIGINT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "target_key" TEXT NOT NULL,
    "tenant_id" BIGINT,
    "task_name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "retry_of" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "attempts_made" INTEGER NOT NULL DEFAULT 0,
    "lease_token" TEXT,
    "lease_until" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "error" VARCHAR(2000) NOT NULL DEFAULT '',
    "result" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_task_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_task_attempts" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "error" VARCHAR(2000) NOT NULL DEFAULT '',

    CONSTRAINT "app_task_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_task_audits" (
    "id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "actor_name" VARCHAR(100) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_task_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_task_dispatches_task_id_created_at_idx" ON "app_task_dispatches"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "app_task_runs_status_created_at_idx" ON "app_task_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "app_task_runs_task_id_status_lease_until_idx" ON "app_task_runs"("task_id", "status", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "app_task_runs_dispatch_id_target_key_key" ON "app_task_runs"("dispatch_id", "target_key");

-- CreateIndex
CREATE UNIQUE INDEX "app_task_attempts_run_id_number_key" ON "app_task_attempts"("run_id", "number");

-- CreateIndex
CREATE INDEX "app_task_audits_task_id_id_idx" ON "app_task_audits"("task_id", "id");

-- AddForeignKey
ALTER TABLE "app_task_dispatches" ADD CONSTRAINT "app_task_dispatches_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "app_scheduled_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_task_runs" ADD CONSTRAINT "app_task_runs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "app_scheduled_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_task_runs" ADD CONSTRAINT "app_task_runs_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "app_task_dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_task_attempts" ADD CONSTRAINT "app_task_attempts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "app_task_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_task_audits" ADD CONSTRAINT "app_task_audits_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "app_scheduled_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_scheduled_tasks"
  ADD CONSTRAINT "app_scheduled_tasks_config_check" CHECK (
    type = 'internal' AND scope IN ('global','selected','all') AND
    timeout_ms BETWEEN 100 AND 300000 AND max_attempts BETWEEN 1 AND 5 AND
    concurrency BETWEEN 1 AND 10 AND revision > 0 AND jsonb_typeof(params) = 'object' AND
    ((scope = 'selected' AND cardinality(tenant_ids) BETWEEN 1 AND 100) OR
     (scope <> 'selected' AND cardinality(tenant_ids) = 0))
  );
ALTER TABLE "app_task_runs"
  ADD CONSTRAINT "app_task_runs_status_check" CHECK (status IN ('queued','running','retrying','succeeded','failed','timed_out','skipped')),
  ADD CONSTRAINT "app_task_runs_target_check" CHECK ((tenant_id IS NULL AND target_key='global') OR (tenant_id IS NOT NULL AND target_key=tenant_id::text));
INSERT INTO app_menus(code,parent_code,kind,path,name,i18n_key,icon,sort_order,scope,min_role)
VALUES('platform-scheduled-tasks','platform','page','/platform/scheduled-tasks','定时任务','menu.platform.scheduled-tasks','clockCircle',60,'platform','user');
