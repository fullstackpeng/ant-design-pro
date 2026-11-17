import * as roles from '@/services/backend/roles';

export type Role = BackendAPI.RoleDto;
export type Permission = BackendAPI.PermissionDto;
export const listRoles = () => roles.listRoles({ skipErrorHandler: true });
export const listPermissions = () =>
  roles.listPermissions({ skipErrorHandler: true });
export const createRole = (body: BackendAPI.CreateRoleDto) =>
  roles.createRole(
    { name: body.name, permissions: body.permissions ?? [] },
    { skipErrorHandler: true },
  );
export const updateRole = (id: string, body: BackendAPI.UpdateRoleDto) =>
  roles.updateRole(
    { id },
    { name: body.name, permissions: body.permissions ?? [] },
    { skipErrorHandler: true },
  );
export const deleteRole = (id: string) =>
  roles.deleteRole({ id }, { skipErrorHandler: true });
