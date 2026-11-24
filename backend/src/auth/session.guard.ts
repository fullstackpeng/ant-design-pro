import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUDIT_ENDPOINT,
  type AuditEndpointOptions,
} from '../audit/audit-action.js';
import { auditContext } from '../audit/audit-context.js';
import { ACCESS_SCOPE, type AccessScope } from './access-scope.decorator.js';
import { AuthService } from './auth.service.js';
import { AuthorizationService } from './authorization.service.js';
import { IS_PUBLIC } from './public.decorator.js';
import { REQUIRED_FEATURE } from './require-feature.decorator.js';
import { REQUIRED_PERMISSION } from './require-permission.decorator.js';
import { type SessionRequest, sessionToken } from './session-context.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const audit = auditContext.getStore();
    const endpoint = this.reflector.get<AuditEndpointOptions>(
      AUDIT_ENDPOINT,
      context.getHandler(),
    );
    if (audit && endpoint && 'event' in endpoint) audit.endpoint = endpoint;
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const session = await this.auth.currentUser(sessionToken(request));
    if (audit) audit.session = session;
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
    if (feature) await this.authorization.requireFeature(session, feature);
    const permission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (permission)
      await this.authorization.requirePermission(session, permission);
    request.sessionContext = session;
    return true;
  }
}
