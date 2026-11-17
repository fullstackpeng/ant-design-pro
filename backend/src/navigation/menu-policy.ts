export function isSystemMenu(menu: { code: string; scope: string }) {
  return (
    menu.scope === 'authenticated' ||
    [
      'platform',
      'platform-tenants',
      'platform-plans',
      'platform-navigation',
      'platform-users',
      'platform-settings',
    ].includes(menu.code)
  );
}
