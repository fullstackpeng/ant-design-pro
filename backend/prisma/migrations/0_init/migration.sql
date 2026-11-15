-- Baseline of the existing tables. Preserve IDENTITY and the access CHECK constraint.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "app_users" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "access" VARCHAR(20) NOT NULL DEFAULT 'user',

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_users_access_check" CHECK ("access" IN ('admin', 'user'))
);

-- CreateTable
CREATE TABLE "app_sessions" (
    "token_hash" CHAR(64) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_username_key" ON "app_users"("username");

-- AddForeignKey
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

