-- Avoid ProLayout prefix matching: menu paths must not be prefixes of each other.
UPDATE app_menus SET path = '/platform/navigation/platform' WHERE code = 'platform-navigation';
UPDATE app_menus SET path = '/platform/mqtt-config' WHERE code = 'platform-mqtt';
UPDATE app_menus SET path = '/tenant/mqtt-config' WHERE code = 'tenant-mqtt';
