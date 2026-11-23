export interface DepartmentNode {
  id: string;
  parentId: string | null;
}

export type DepartmentTreeNode<T> = T & { children?: DepartmentTreeNode<T>[] };

export function departmentTree<T extends DepartmentNode>(
  rows: T[],
  parentId: string | null = null,
): DepartmentTreeNode<T>[] {
  return rows
    .filter((row) => row.parentId === parentId)
    .map((row) => {
      const children = departmentTree(rows, row.id);
      return { ...row, ...(children.length ? { children } : {}) };
    });
}

export function departmentDescendants(
  rows: DepartmentNode[],
  root: string,
): Set<string> {
  const found = new Set([root]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (row.parentId && found.has(row.parentId) && !found.has(row.id)) {
        found.add(row.id);
        changed = true;
      }
    }
  }
  return found;
}
