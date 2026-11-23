import { describe, expect, it, vi } from 'vitest';
import { menuTarget, menuTree } from './navigation';

vi.mock('./backend/navigation', () => ({ currentNavigation: vi.fn() }));

function menu(code: string, parentCode: string | null, sortOrder: number, kind: BackendAPI.MenuDto['kind'] = 'page'): BackendAPI.MenuDto {
  return { code, parentCode, name: code, i18nKey: null, path: `/${code}`, icon: '', sortOrder, scope: 'tenant', minRole: 'user', isActive: true, featureCode: 'list', kind, isSystem: false };
}

describe('remote menu rendering', () => {
  it('translates stable menu keys in every level while preserving custom fallback names', () => {
    const menus = [
      { ...menu('dashboard', null, 0, 'directory'), i18nKey: 'menu.dashboard', name: 'Dashboard fallback' },
      { ...menu('analysis', 'dashboard', 0), i18nKey: 'menu.dashboard.analysis' },
      { ...menu('custom', null, 1), name: 'Custom directory' },
    ];
    const translated = menuTree(menus, null, (key, fallback) => ({
      'menu.dashboard': 'Dashboard', 'menu.dashboard.analysis': 'Analysis',
    })[key] ?? fallback);
    expect(translated[0].name).toBe('Dashboard');
    expect(translated[0].children?.[0].name).toBe('Analysis');
    expect(translated[1].name).toBe('Custom directory');
    expect(menuTree(menus, null, (_key, fallback) => fallback)[0].name).toBe('Dashboard fallback');
  });

  it('keeps personal routes out of the sidebar even in an older server response', () => {
    expect(menuTree([
      menu('account', null, 0, 'directory'),
      { ...menu('settings', 'account', 0), path: '/account/settings' },
      { ...menu('center', null, 0), path: '/account/center' },
      menu('welcome', null, 0),
    ]).map(item => item.key)).toEqual(['welcome']);
  });
  it('opens the first available descendant of a directory using persisted ordering', () => {
    expect(menuTarget([
      menu('dashboard', null, 0, 'directory'), menu('monitor', 'dashboard', 20),
      menu('workplace', 'dashboard', 10),
    ], '/dashboard')).toBe('/workplace');
    expect(menuTarget([], '/dashboard/analysis')).toBe('/dashboard/analysis');
  });
  it('keeps custom directories free of fabricated page paths and resolves their descendants', () => {
    const menus = [menu('dashboard', null, 0, 'directory'),
      { ...menu('custom', 'dashboard', 0, 'directory'), path: null }, menu('monitor', 'custom', 0)];
    expect(menuTree(menus)[0].children?.[0].path).toBeUndefined();
    expect(menuTarget(menus, '/dashboard')).toBe('/monitor');
  });
  it('retains nested search pages and follows persisted sibling ordering', () => {
    const result = menuTree([
      menu('articles', 'search', 30), menu('search', 'list', 20),
      menu('list', null, 10), menu('projects', 'search', 10), menu('home', null, 0),
    ]);
    expect(result.map(item => item.key)).toEqual(['home', 'list']);
    expect(result[1].children?.[0].children?.map(item => item.key)).toEqual(['projects', 'articles']);
  });

  it('does not restore static menus for an empty response or expose orphaned entries', () => {
    expect(menuTree([])).toEqual([]);
    expect(menuTree([menu('hidden-child', 'missing-parent', 0)])).toEqual([]);
  });

  it('treats an unrecognized icon as data, while keeping the persisted name and path', () => {
    const result = menuTree([{ ...menu('home', null, 0), name: 'Custom home', icon: '<script>' }]);
    expect(result[0]).toMatchObject({ name: 'Custom home', path: '/home', icon: undefined });
  });

  it('resolves message-center icons stored in the database', () => {
    const result = menuTree([
      { ...menu('message-center', null, 50, 'directory'), icon: 'mail' },
      { ...menu('inbox', 'message-center', 10), icon: 'inbox' },
      { ...menu('notifications', 'message-center', 20), icon: 'notification' },
    ]);
    expect(result[0].icon).toBeDefined();
    expect(result[0].children?.[0].icon).toBeDefined();
    expect(result[0].children?.[1].icon).toBeDefined();
  });
  it('resolves organization menu icons stored in the database', () => {
    const result = menuTree([
      { ...menu('tenant-departments', null, 72), icon: 'team' },
      { ...menu('tenant-positions', null, 73), icon: 'idcard' },
    ]);
    expect(result.every(item => item.icon !== undefined)).toBe(true);
  });
});
