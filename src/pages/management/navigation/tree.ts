export interface MenuRow extends BackendAPI.MenuDto {
  children?: MenuRow[];
}

export function menuRows(
  menus: BackendAPI.MenuDto[],
  parentCode: string | null = null,
): MenuRow[] {
  return menus
    .filter((menu) => menu.parentCode === parentCode)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map((menu) => {
      const children = menuRows(menus, menu.code);
      return { ...menu, ...(children.length ? { children } : {}) };
    });
}

export function descendants(
  menus: BackendAPI.MenuDto[],
  code?: string,
): Set<string> {
  const excluded = new Set<string>(code ? [code] : []);
  const visit = (parent: string) => {
    for (const menu of menus.filter((menu) => menu.parentCode === parent)) {
      excluded.add(menu.code);
      visit(menu.code);
    }
  };
  if (code) visit(code);
  return excluded;
}
