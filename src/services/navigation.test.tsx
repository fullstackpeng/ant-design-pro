import { describe, expect, it, vi } from 'vitest';
import { menuTarget, menuTree } from './navigation';

vi.mock('./backend/navigation', () => ({ currentNavigation: vi.fn() }));

function menu(code: string, parentCode: string | null, sortOrder: number, kind: BackendAPI.MenuDto['kind'] = 'page'): BackendAPI.MenuDto {
  return { code, parentCode, name: code, path: `/${code}`, icon: '', sortOrder, scope: 'tenant', minRole: 'user', isActive: true, featureCode: 'list', kind, isSystem: false };
}

describe('remote menu rendering', () => {
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
});
