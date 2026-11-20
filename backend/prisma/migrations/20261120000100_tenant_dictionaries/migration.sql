BEGIN;
CREATE TABLE app_dictionary_types (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES app_tenants(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  remark VARCHAR(500) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, code),
  UNIQUE(tenant_id, id)
);
CREATE TABLE app_dictionary_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  dictionary_id BIGINT NOT NULL,
  value VARCHAR(64) NOT NULL,
  label VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color VARCHAR(20) NOT NULL DEFAULT '',
  FOREIGN KEY(tenant_id, dictionary_id) REFERENCES app_dictionary_types(tenant_id, id) ON DELETE RESTRICT,
  UNIQUE(tenant_id, dictionary_id, value),
  UNIQUE(tenant_id, id)
);
INSERT INTO app_features (code, name) VALUES ('dictionaries', '字典管理');
INSERT INTO app_menus (code, kind, path, name, i18n_key, icon, sort_order, scope, min_role, feature_code)
VALUES ('tenant-dictionaries', 'page', '/tenant/dictionaries', '字典管理', 'menu.tenant-dictionaries', 'book', 65, 'tenant', 'admin', 'dictionaries');
-- Only development demo tenants receive this new feature automatically.
INSERT INTO app_tenant_features (tenant_id, feature_code)
SELECT id, 'dictionaries' FROM app_tenants WHERE code IN ('tenant-a', 'tenant-b');
COMMIT;
