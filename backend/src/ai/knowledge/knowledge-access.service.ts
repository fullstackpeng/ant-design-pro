import { Inject, Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../auth/authorization.service.js';
import { registeredPages } from '../../auth/page-registry.js';
import { permissionCatalog } from '../../auth/permissions.js';
import type { SessionContext } from '../../auth/session-context.js';
import { id, invalid, tenantId } from '../../common/validation.js';
import type { Prisma } from '../../generated/prisma/client.js';

export interface AiAccessContext {
  userId: bigint;
  tenantId: bigint;
  permissions: string[];
  pages: { code: string; path: string }[];
}

export function permissionFilter(permissions: string[]) {
  return {
    OR: [
      { isPublic: true },
      {
        isPublic: false,
        permissionMode: 'ALL',
        permissions: {
          some: {},
          every: { permissionCode: { in: permissions } },
        },
      },
      {
        isPublic: false,
        permissionMode: 'ANY',
        permissions: { some: { permissionCode: { in: permissions } } },
      },
    ],
  };
}

@Injectable()
export class KnowledgeAccessService {
  constructor(
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  async context(session: SessionContext): Promise<AiAccessContext> {
    const resolved = await this.authorization.resolve(session);
    return {
      userId: id(session.userid),
      tenantId: tenantId(session),
      permissions: resolved.permissions,
      pages: resolved.pages,
    };
  }

  assistants(context: AiAccessContext): Prisma.AiAssistantWhereInput {
    return {
      isActive: true,
      AND: [
        {
          OR: [
            { publicationScope: 'all' },
            {
              publicationScope: 'selected',
              tenants: { some: { tenantId: context.tenantId } },
            },
          ],
        },
        permissionFilter(context.permissions),
      ],
    };
  }

  documents(
    context: AiAccessContext,
    assistantId: bigint,
  ): Prisma.AiKnowledgeDocumentWhereInput {
    return {
      status: 'published',
      knowledgeBase: {
        isActive: true,
        assistants: {
          some: { assistantId, assistant: this.assistants(context) },
        },
      },
      ...permissionFilter(context.permissions),
    };
  }

  validatePermissions(codes: string[]) {
    if (
      codes.some(
        (code) =>
          !permissionCatalog.some((permission) => permission.code === code),
      )
    )
      invalid('包含未注册的业务权限');
  }

  validatePage(code: string | undefined) {
    if (
      code &&
      !registeredPages.some(
        (page) => page.code === code && page.scope !== 'platform',
      )
    )
      invalid('导航页面未注册或不属于租户');
  }
}
