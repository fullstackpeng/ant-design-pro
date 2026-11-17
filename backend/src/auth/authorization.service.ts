import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { id } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { registeredPages } from './page-registry.js';
import { availablePermissions } from './permissions.js';
import type { SessionContext } from './session-context.js';

@Injectable()
export class AuthorizationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async featureCodes(tenant: string) {
    const row = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: id(tenant) },
      select: {
        features: {
          select: { featureCode: true },
          orderBy: { featureCode: 'asc' },
        },
      },
    });
    return row.features.map((feature) => feature.featureCode);
  }

  async resolve(session: SessionContext) {
    const features = session.tenant
      ? await this.featureCodes(session.tenant.id)
      : [];
    const permissions = await this.memberPermissions(session, features);
    const pages = registeredPages.filter((page) => {
      if (
        page.scope !== 'authenticated' &&
        page.scope !== (session.tenant ? 'tenant' : 'platform')
      )
        return false;
      if (page.featureCode && !features.includes(page.featureCode))
        return false;
      if (page.permissionCode) return permissions.includes(page.permissionCode);
      return page.minRole === 'user' || session.access === 'admin';
    });
    return { permissions, pages };
  }

  private async memberPermissions(session: SessionContext, features: string[]) {
    if (!session.tenant) return [];
    const catalog = availablePermissions(features);
    if (session.access === 'admin')
      return catalog.map((permission) => permission.code);
    const roles = await this.prisma.memberRole.findMany({
      where: { tenantId: id(session.tenant.id), userId: id(session.userid) },
      select: { role: { select: { permissions: true } } },
    });
    // Explicit registry metadata preserves legacy access until custom roles are assigned.
    const granted = roles.length
      ? roles.flatMap(({ role }) => role.permissions)
      : catalog
          .filter((permission) => permission.defaultMemberAccess)
          .map((permission) => permission.code);
    return catalog
      .filter((permission) => granted.includes(permission.code))
      .map((permission) => permission.code);
  }

  async requireFeature(session: SessionContext, featureCode: string) {
    if (
      !session.tenant ||
      !(await this.featureCodes(session.tenant.id)).includes(featureCode)
    )
      throw new ForbiddenException({
        success: false,
        errorMessage: '当前租户未开通该功能',
      });
  }

  async requirePermission(session: SessionContext, permission: string) {
    if (!(await this.resolve(session)).permissions.includes(permission))
      throw new ForbiddenException({
        success: false,
        errorMessage: '无权执行此操作',
      });
  }
}
