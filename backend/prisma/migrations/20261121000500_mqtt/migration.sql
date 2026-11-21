-- CreateTable
CREATE TABLE "app_mqtt_platform_brokers" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(100) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "use_tls" BOOLEAN NOT NULL DEFAULT false,
    "default_protocol" VARCHAR(10) NOT NULL DEFAULT '3.1.1',
    "admin_username" VARCHAR(150) NOT NULL,
    "admin_password" TEXT NOT NULL,
    "bridge_username" VARCHAR(150) NOT NULL,
    "bridge_password" TEXT NOT NULL,
    "response_topic" VARCHAR(200) NOT NULL DEFAULT '$CONTROL/dynamic-security/v1/response',
    "command_timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_mqtt_platform_brokers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_mqtt_platform_brokers_singleton" CHECK ("id" = 1)
);

-- CreateTable
CREATE TABLE "app_tenant_mqtt_credentials" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "platform_broker_id" INTEGER NOT NULL DEFAULT 1,
    "username" VARCHAR(150) NOT NULL,
    "password" TEXT NOT NULL,
    "role_name" VARCHAR(150) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_error" VARCHAR(2000) NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provisioned_at" TIMESTAMPTZ(6),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_tenant_mqtt_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_tenant_mqtt_brokers" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "use_tls" BOOLEAN NOT NULL DEFAULT false,
    "protocol_version" VARCHAR(10) NOT NULL DEFAULT '3.1.1',
    "username" VARCHAR(150) NOT NULL DEFAULT '',
    "password" TEXT NOT NULL DEFAULT '',
    "client_id_prefix" VARCHAR(100) NOT NULL DEFAULT '',
    "subscribe_filter" VARCHAR(512) NOT NULL DEFAULT '#',
    "keepalive_seconds" INTEGER NOT NULL DEFAULT 60,
    "clean_start" BOOLEAN NOT NULL DEFAULT false,
    "session_expiry_seconds" INTEGER NOT NULL DEFAULT 86400,
    "default_qos" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_tenant_mqtt_brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_mqtt_messages" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "broker_type" VARCHAR(20) NOT NULL,
    "broker_id" BIGINT NOT NULL,
    "topic" VARCHAR(512) NOT NULL,
    "payload" TEXT NOT NULL,
    "payload_encoding" VARCHAR(10) NOT NULL DEFAULT 'utf8',
    "qos" INTEGER NOT NULL DEFAULT 0,
    "retain" BOOLEAN NOT NULL DEFAULT false,
    "direction" VARCHAR(20) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_mqtt_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_mqtt_outbox" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "broker_type" VARCHAR(20) NOT NULL,
    "broker_id" BIGINT NOT NULL,
    "topic" VARCHAR(512) NOT NULL,
    "payload" TEXT NOT NULL,
    "payload_encoding" VARCHAR(10) NOT NULL DEFAULT 'utf8',
    "qos" INTEGER NOT NULL DEFAULT 1,
    "retain" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(2000) NOT NULL DEFAULT '',
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_mqtt_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_mqtt_secret_audits" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "actor_name" VARCHAR(100) NOT NULL,
    "tenant_id" BIGINT,
    "credential_id" BIGINT,
    "action" VARCHAR(30) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" VARCHAR(64) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_mqtt_secret_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_tenant_mqtt_credentials_tenant_id_platform_broker_id_key" ON "app_tenant_mqtt_credentials"("tenant_id", "platform_broker_id");
CREATE INDEX "app_tenant_mqtt_credentials_status_next_attempt_at_idx" ON "app_tenant_mqtt_credentials"("status", "next_attempt_at");
CREATE UNIQUE INDEX "app_tenant_mqtt_brokers_tenant_id_name_key" ON "app_tenant_mqtt_brokers"("tenant_id", "name");
CREATE INDEX "app_tenant_mqtt_brokers_tenant_id_is_default_idx" ON "app_tenant_mqtt_brokers"("tenant_id", "is_default");
CREATE UNIQUE INDEX "app_tenant_mqtt_brokers_one_default" ON "app_tenant_mqtt_brokers"("tenant_id") WHERE "is_default";
CREATE UNIQUE INDEX "app_mqtt_messages_idempotency_key_key" ON "app_mqtt_messages"("idempotency_key");
CREATE INDEX "app_mqtt_messages_tenant_id_id_idx" ON "app_mqtt_messages"("tenant_id", "id");
CREATE INDEX "app_mqtt_messages_broker_type_broker_id_id_idx" ON "app_mqtt_messages"("broker_type", "broker_id", "id");
CREATE INDEX "app_mqtt_messages_created_at_idx" ON "app_mqtt_messages"("created_at");
CREATE INDEX "app_mqtt_outbox_status_next_attempt_at_idx" ON "app_mqtt_outbox"("status", "next_attempt_at");
CREATE INDEX "app_mqtt_secret_audits_actor_id_action_created_at_idx" ON "app_mqtt_secret_audits"("actor_id", "action", "created_at");

-- AddForeignKey
ALTER TABLE "app_tenant_mqtt_credentials" ADD CONSTRAINT "app_tenant_mqtt_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "app_tenant_mqtt_brokers" ADD CONSTRAINT "app_tenant_mqtt_brokers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "app_mqtt_messages" ADD CONSTRAINT "app_mqtt_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "app_tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Feature and menus
INSERT INTO app_features(code, name) VALUES ('mqtt', 'MQTT');
INSERT INTO app_tenant_features (tenant_id, feature_code)
SELECT id, 'mqtt' FROM app_tenants;

INSERT INTO app_menus (code, parent_code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code) VALUES
('platform-mqtt', 'platform', 'page', '/platform/mqtt', 'MQTT 配置', 'menu.platform.mqtt', 'api', 78, 'platform', 'user', NULL),
('platform-mqtt-test', 'platform', 'page', '/platform/mqtt-test', 'MQTT 测试', 'menu.platform.mqtt-test', 'api', 79, 'platform', 'user', NULL),
('platform-mqtt-messages', 'platform', 'page', '/platform/mqtt-messages', 'MQTT 消息', 'menu.platform.mqtt-messages', 'read', 80, 'platform', 'user', NULL),
('tenant-mqtt', NULL, 'page', '/tenant/mqtt', 'MQTT 配置', 'menu.tenant-mqtt', 'api', 67, 'tenant', 'admin', 'mqtt'),
('tenant-mqtt-test', NULL, 'page', '/tenant/mqtt-test', 'MQTT 测试', 'menu.tenant-mqtt-test', 'api', 68, 'tenant', 'admin', 'mqtt');
