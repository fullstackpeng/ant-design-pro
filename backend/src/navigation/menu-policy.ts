export function isSystemMenu(menu: { code: string; scope: string }) {
  // Platform and shared authenticated navigation are code-owned.
  return menu.scope === 'authenticated' || menu.scope === 'platform';
}
