import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NavigationService } from '../navigation/navigation.service.js';
import { REQUIRED_FEATURE } from '../navigation/require-feature.decorator.js';
import { ACCESS_SCOPE, type AccessScope } from './access-scope.decorator.js';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC } from './public.decorator.js';
import { type SessionRequest, sessionToken } from './session-context.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(NavigationService) private readonly navigation: NavigationService,
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
      requestedTenant !== session.tenant?.id
    ) {
      throw new ForbiddenException({
        success: false,
        errorMessage: '不能访问其他租户',
      });
    }
    const scope =
      this.reflector.getAllAndOverride<AccessScope>(ACCESS_SCOPE, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'tenant';
    if (
      (scope === 'platform' && !session.isPlatformAdmin) ||
      ((scope === 'tenant' || scope === 'tenant-admin') && !session.tenant) ||
      (scope === 'tenant-admin' && session.access !== 'admin')
    ) {
      throw new ForbiddenException({
        success: false,
        errorMessage: '无权执行此操作',
      });
    }
    const feature = this.reflector.getAllAndOverride<string>(REQUIRED_FEATURE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (feature) await this.navigation.requireFeature(session, feature);
    request.sessionContext = session;
    return true;
  }
}
