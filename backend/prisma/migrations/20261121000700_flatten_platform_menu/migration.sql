-- Platform modules are shown as top-level groups; the wrapper menu is removed.
UPDATE app_menus SET parent_code = NULL WHERE parent_code = 'platform';
DELETE FROM app_menus WHERE code = 'platform';
