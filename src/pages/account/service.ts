import * as account from '@/services/backend/account';
export type AccountProfile = BackendAPI.AccountProfileDto;
export const accountProfile = () =>
  account.accountProfile({ skipErrorHandler: true });
export const updateAccountProfile = (
  body: BackendAPI.UpdateAccountProfileDto,
) => account.updateAccountProfile(body, { skipErrorHandler: true });
export const uploadAccountAvatar = (file: File) =>
  account.uploadAccountAvatar({}, file, { skipErrorHandler: true });
export const removeAccountAvatar = () =>
  account.removeAccountAvatar({ skipErrorHandler: true });
export const changeAccountPassword = (
  body: BackendAPI.ChangeAccountPasswordDto,
) => account.changeAccountPassword(body, { skipErrorHandler: true });
export const revokeOtherAccountSessions = () =>
  account.revokeOtherAccountSessions({ skipErrorHandler: true });
