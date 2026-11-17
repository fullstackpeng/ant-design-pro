import { describe, expect, it } from 'vitest';
import { descendants, menuRows } from './tree';

function menu(
  code: string,
  parentCode: string | null,
  kind: BackendAPI.MenuDto['kind'] = 'directory',
): BackendAPI.MenuDto {
  return {
    code,
    parentCode,
    kind,
    path: kind === 'page' ? `/${code}` : null,
    name: code,
    icon: '',
    sortOrder: 0,
    scope: 'tenant',
    minRole: 'user',
    featureCode: null,
    isActive: true,
    isSystem: false,
  };
}

describe('menu hierarchy editing', () => {
  const menus = [
    menu('root', null),
    menu('child', 'root'),
    menu('page', 'child', 'page'),
    menu('sibling', null),
  ];
  it('preserves nested page entries without giving a directory a fake route', () => {
    const rows = menuRows(menus);
    expect(rows[0].path).toBeNull();
    expect(rows[0].children?.[0].children?.[0].code).toBe('page');
  });
  it('excludes a directory and every descendant from possible move targets', () => {
    expect([...descendants(menus, 'root')]).toEqual(['root', 'child', 'page']);
    expect(descendants(menus, 'child').has('root')).toBe(false);
    expect(descendants(menus)).toEqual(new Set());
  });
});
