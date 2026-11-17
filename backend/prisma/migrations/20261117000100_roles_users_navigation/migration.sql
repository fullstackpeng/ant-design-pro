BEGIN;
ALTER TABLE app_users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE app_menus ADD COLUMN i18n_key VARCHAR(150);
CREATE TABLE app_tenant_roles (
 id BIGSERIAL PRIMARY KEY, tenant_id BIGINT NOT NULL REFERENCES app_tenants(id) ON DELETE CASCADE,
 name VARCHAR(100) NOT NULL, permissions TEXT[] NOT NULL DEFAULT '{}',
 UNIQUE(tenant_id, name), UNIQUE(tenant_id, id)
);
CREATE TABLE app_member_roles (
 tenant_id BIGINT NOT NULL, user_id BIGINT NOT NULL, role_id BIGINT NOT NULL,
 PRIMARY KEY(tenant_id, user_id, role_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES app_tenant_memberships(tenant_id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,role_id) REFERENCES app_tenant_roles(tenant_id,id) ON DELETE RESTRICT
);
-- Personal pages remain registered and accessible through the avatar menu.
DELETE FROM app_menus WHERE path IN ('/account/center','/account/settings');
DELETE FROM app_menus WHERE code = 'account' AND NOT EXISTS (SELECT 1 FROM app_menus c WHERE c.parent_code = 'account');
INSERT INTO app_menus (code,parent_code,kind,path,name,icon,sort_order,scope,min_role,feature_code)
VALUES ('platform-users','platform','page','/platform/users','用户管理','user',35,'platform','user',NULL),
 ('tenant-roles',NULL,'page','/tenant/roles','角色管理','team',45,'tenant','admin','members');
UPDATE app_menus SET i18n_key = CASE
 WHEN code = 'list-search-list' THEN 'menu.list.search-list'
 WHEN path LIKE '/list/search/%' THEN 'menu.list.search-list.' || split_part(path,'/',4)
 WHEN path IS NOT NULL THEN 'menu.' || replace(trim(both '/' from path), '/', '.')
 WHEN code = 'tenant-members' THEN 'menu.tenant-members'
 ELSE 'menu.' || code END;
UPDATE app_menus SET i18n_key = 'menu.tenant-members' WHERE code = 'tenant-members';
UPDATE app_menus SET i18n_key = 'menu.tenant-roles' WHERE code = 'tenant-roles';
COMMIT;
