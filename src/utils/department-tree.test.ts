import { describe, expect, it } from 'vitest';
import { departmentDescendants, departmentTree } from './department-tree';

describe('department organization', () => {
  const rows = [
    { id: '1', parentId: null },
    { id: '2', parentId: '1' },
    { id: '3', parentId: '2' },
    { id: '4', parentId: null },
  ];

  it('preserves server ordering and nests descendants for tables and selectors', () => {
    const tree = departmentTree(rows);
    expect(tree.map((row) => row.id)).toEqual(['1', '4']);
    expect(tree[0].children?.[0].children?.[0].id).toBe('3');
    expect(tree[1].children).toBeUndefined();
  });

  it('excludes the edited department and all descendants from parent selection', () => {
    expect([...departmentDescendants(rows, '1')]).toEqual(['1', '2', '3']);
    expect([...departmentDescendants(rows, '2')]).toEqual(['2', '3']);
  });
});
