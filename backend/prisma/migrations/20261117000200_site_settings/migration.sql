BEGIN;
CREATE TABLE app_site_settings (
 id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 title VARCHAR(100) NOT NULL,
 logo VARCHAR(2048) NOT NULL,
 login_background VARCHAR(2048) NOT NULL,
 footer_text VARCHAR(200) NOT NULL,
 color_primary VARCHAR(7) NOT NULL,
 default_locale VARCHAR(20) NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
INSERT INTO app_site_settings (title,logo,login_background,footer_text,color_primary,default_locale)
VALUES ('Ant Design Pro','https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr',
 'Ant Design Pro','#1677ff','zh-CN');
CREATE TABLE app_site_settings_audits (
 id BIGSERIAL PRIMARY KEY,
 actor_id BIGINT NOT NULL,
 actor_name VARCHAR(100) NOT NULL,
 before JSONB NOT NULL,
 after JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO app_menus (code,parent_code,kind,path,name,i18n_key,icon,sort_order,scope,min_role,feature_code)
VALUES ('platform-settings','platform','page','/platform/settings','系统配置','menu.platform.settings','setting',80,'platform','user',NULL);
COMMIT;
