import * as auth from './backend/auth';

export type LoginParams = BackendAPI.LoginDto;
export type CurrentUser = BackendAPI.CurrentUserDto;

export const login = (body: LoginParams) => auth.login(body, { skipErrorHandler: true });
export const currentUser = () => auth.currentUser({ skipErrorHandler: true });
export const outLogin = () => auth.logout({ skipErrorHandler: true });
