import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC } from './public.decorator.js';
import { type SessionRequest, sessionToken } from './session-context.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const session = await this.auth.currentUser(sessionToken(request));
    const requestedTenant = request.headers['x-tenant-id'];
    if (
      requestedTenant !== undefined &&
      requestedTenant !== session.tenant.id
    ) {
      throw new ForbiddenException({
        success: false,
        errorMessage: '不能访问其他租户',
      });
    }
    request.sessionContext = session;
    return true;
  }
}
