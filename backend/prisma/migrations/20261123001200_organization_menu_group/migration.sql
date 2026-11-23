-- Place organization pages beside role management in tenant settings.
UPDATE app_menus
SET parent_code = 'tenant-settings', sort_order = 221
WHERE code = 'tenant-departments';

UPDATE app_menus
SET parent_code = 'tenant-settings', sort_order = 222
WHERE code = 'tenant-positions';
