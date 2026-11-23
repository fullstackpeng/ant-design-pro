// Includes the selected department and all descendants; tolerate legacy cycles.
export function departmentSubtree(
  rows: readonly { id: bigint; parentId: bigint | null }[],
  root: bigint,
): bigint[] {
  const children = new Map<bigint, bigint[]>();
  for (const row of rows) {
    if (row.parentId !== null) {
      const siblings = children.get(row.parentId) ?? [];
      siblings.push(row.id);
      children.set(row.parentId, siblings);
    }
  }
  const found = new Set<bigint>();
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    if (current === undefined || found.has(current)) continue;
    found.add(current);
    pending.push(...(children.get(current) ?? []));
  }
  return [...found];
}
