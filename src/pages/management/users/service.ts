import * as users from '@/services/backend/users';

export type User = BackendAPI.PlatformUserDto;
export const listUsers = (params: BackendAPI.listUsersParams = {}) =>
  users.listUsers(params, { skipErrorHandler: true });
export const createUser = (body: BackendAPI.CreateUserDto) =>
  users.createUser(body, { skipErrorHandler: true });
export const updateUser = (id: string, body: BackendAPI.UpdateUserDto) =>
  users.updateUser({ id }, body, { skipErrorHandler: true });
export const resetUserPassword = (
  id: string,
  body: BackendAPI.ResetPasswordDto,
) => users.resetUserPassword({ id }, body, { skipErrorHandler: true });
