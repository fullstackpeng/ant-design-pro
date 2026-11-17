import * as navigation from '@/services/backend/navigation';

export const listMenus = () => navigation.listMenus({ skipErrorHandler: true });
export const listFeatures = () =>
  navigation.listFeatures({ skipErrorHandler: true });
export const tenantFeatures = (id: string) =>
  navigation.tenantFeatures({ id }, { skipErrorHandler: true });
export const assignTenantFeatures = (id: string, featureCodes: string[]) =>
  navigation.assignTenantFeatures(
    { id },
    { featureCodes },
    { skipErrorHandler: true },
  );
export const updateMenu = (code: string, body: BackendAPI.UpdateMenuDto) =>
  navigation.updateMenu({ code }, body, { skipErrorHandler: true });
export const createMenu = (body: BackendAPI.CreateMenuDto) =>
  navigation.createMenu(body, { skipErrorHandler: true });
export const deleteMenu = (code: string) =>
  navigation.deleteMenu({ code }, { skipErrorHandler: true });
export const listRegisteredPages = () =>
  navigation.listRegisteredPages({ skipErrorHandler: true });
