BEGIN;
CREATE TABLE app_platform_dictionary_types (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  remark VARCHAR(500) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE app_platform_dictionary_items (
  id BIGSERIAL PRIMARY KEY,
  dictionary_id BIGINT NOT NULL REFERENCES app_platform_dictionary_types(id) ON DELETE RESTRICT,
  value VARCHAR(64) NOT NULL,
  label VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color VARCHAR(20) NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE(dictionary_id, value)
);
CREATE TABLE app_dictionary_audits (
  id BIGSERIAL PRIMARY KEY,
  scope VARCHAR(20) NOT NULL,
  tenant_id BIGINT REFERENCES app_tenants(id) ON DELETE CASCADE,
  dictionary_code VARCHAR(64) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK(entity_type IN ('type', 'item')),
  target_value VARCHAR(64) NOT NULL DEFAULT '',
  action VARCHAR(20) NOT NULL CHECK(action IN ('create', 'update')),
  actor_id BIGINT NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  before JSONB NOT NULL,
  after JSONB NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK((scope='platform' AND tenant_id IS NULL) OR (scope='tenant' AND tenant_id IS NOT NULL))
);
CREATE INDEX app_dictionary_audits_scope_tenant_id_dictionary_code_id_idx ON app_dictionary_audits(scope,tenant_id,dictionary_code,id);
ALTER TABLE app_tenants ADD COLUMN industry VARCHAR(64) NOT NULL DEFAULT '';
INSERT INTO app_menus(code,parent_code,kind,path,name,i18n_key,icon,sort_order,scope,min_role)
VALUES('platform-dictionaries','platform','page','/platform/dictionaries','平台字典','menu.platform.dictionaries','book',55,'platform','user');
-- Shared baseline for the tenant-management industry field; tenant dictionaries are untouched.
INSERT INTO app_platform_dictionary_types(code,name,remark)
VALUES('industry','所属行业','平台统一维护，供租户管理的所属行业字段使用。');
INSERT INTO app_platform_dictionary_items(dictionary_id,value,label,sort_order,color)
SELECT d.id,v.value,v.label,v.sort_order,v.color FROM app_platform_dictionary_types d
CROSS JOIN (VALUES ('it','信息技术',10,'blue'),('manufacturing','制造业',20,'cyan'),('retail','零售业',30,'green'),('finance','金融业',40,'orange'),('education','教育行业',50,'purple'),('other','其他',60,'')) AS v(value,label,sort_order,color)
WHERE d.code='industry';
COMMIT;
