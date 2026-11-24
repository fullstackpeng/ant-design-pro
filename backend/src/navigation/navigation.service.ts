import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { directoryPaths, registeredPages } from '../auth/page-registry.js';
import type { SessionContext } from '../auth/session-context.js';
import { id } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Menu, Prisma } from '../generated/prisma/client.js';
import { isSystemMenu } from './menu-policy.js';
import type { CreateMenuDto, UpdateMenuDto } from './navigation.dto.js';

@Injectable()
export class NavigationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
  ) {}

  async current(session: SessionContext) {
    const { permissions, pages } = await this.authorization.resolve(session);
    const rows = await this.prisma.menu.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    const candidates = rows.filter(
      (menu) =>
        menu.isActive &&
        (menu.kind === 'directory' ||
          registeredPages.some(
            (page) => page.path === menu.path && page.showInMenu,
          )) &&
        (menu.scope === 'authenticated' ||
          menu.scope === (session.tenant ? 'tenant' : 'platform')) &&
        (menu.kind === 'directory' ||
          pages.some(
            (page) => page.path === menu.path && page.scope === menu.scope,
          )),
    );
    const byCode = new Map(candidates.map((menu) => [menu.code, menu]));
    const visible = (menu: (typeof rows)[number]): boolean => {
      if (!menu.parentCode) return true;
      const parent = byCode.get(menu.parentCode);
      return parent !== undefined && visible(parent);
    };
    const visibleCandidates = candidates.filter(visible);
    const hasPage = (menu: (typeof rows)[number]): boolean => {
      if (menu.kind === 'page') return true;
      return visibleCandidates.some(
        (child) => child.parentCode === menu.code && hasPage(child),
      );
    };
    const menus = visibleCandidates
      .filter(hasPage)
      .map((menu) => this.menuDto(menu));
    const allowedPaths = [
      ...pages.map((page) => page.path),
      ...directoryPaths.filter((path) =>
        pages.some((page) => page.path.startsWith(`${path}/`)),
      ),
    ];
    return { menus, allowedPaths, permissions };
  }

  features() {
    return this.prisma.feature.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
    });
  }
  async menus() {
    const rows = await this.prisma.menu.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    return rows.map((menu) => this.menuDto(menu));
  }

  pages() {
    return registeredPages
      .filter((page) => page.showInMenu)
      .map(({ code, path, name, scope, featureCode, minRole }) => ({
        code,
        path,
        name,
        scope,
        featureCode,
        minRole,
      }));
  }

  private menuDto(menu: Menu) {
    return { ...menu, isSystem: isSystemMenu(menu) };
  }

  private async validateParent(
    tx: Prisma.TransactionClient,
    menu: { code: string; scope: string },
    parentCode: string | null,
  ) {
    const visited = new Set([menu.code]);
    let code = parentCode;
    while (code) {
      if (visited.has(code))
        throw new BadRequestException({
          success: false,
          errorMessage: '不能将菜单放入自身或子目录',
        });
      visited.add(code);
      const parent = await tx.menu.findUnique({ where: { code } });
      if (parent?.kind !== 'directory')
        throw new BadRequestException({
          success: false,
          errorMessage: '父级必须是已存在的目录',
        });
      if (parent.scope !== menu.scope)
        throw new BadRequestException({
          success: false,
          errorMessage: '父目录与菜单必须属于同一端',
        });
      code = parent.parentCode;
    }
  }

  @AuditAction({ event: 'menus.create', name: '创建菜单', entity: 'menu' })
  async createMenu(body: CreateMenuDto) {
    const page =
      body.kind === 'page'
        ? this.pages().find((page) => page.code === body.pageCode)
        : undefined;
    if (body.kind === 'page' && !page)
      throw new BadRequestException({
        success: false,
        errorMessage: '只能选择已注册页面',
      });
    const scope = page?.scope ?? body.scope;
    if (!scope)
      throw new BadRequestException({
        success: false,
        errorMessage: '请选择目录所属端',
      });
    const code = `menu-${randomUUID()}`;
    const parentCode = body.parentCode ?? null;
    return this.menuDto(
      await transaction(this.prisma, async (tx) => {
        await this.validateParent(tx, { code, scope }, parentCode);
        if (page && (await tx.menu.findUnique({ where: { path: page.path } })))
          throw new ConflictException({
            success: false,
            errorMessage: '该页面已添加菜单，请编辑已有入口',
          });
        return tx.menu.create({
          data: {
            code,
            kind: body.kind,
            parentCode,
            name: body.name,
            i18nKey: body.i18nKey || null,
            icon: body.icon,
            sortOrder: body.sortOrder,
            isActive: body.isActive,
            path: page?.path ?? null,
            scope,
            minRole: page?.minRole ?? 'user',
            featureCode: page?.featureCode ?? null,
          },
        });
      }),
    );
  }

  tenantFeatures(tenant: string) {
    return this.authorization.featureCodes(tenant);
  }

  @AuditAction({
    event: 'features.assign',
    name: '分配租户功能',
    targetArg: 0,
    entity: 'tenantFeature',
  })
  async assignFeatures(tenant: string, codes: string[]) {
    const tenantId = id(tenant);
    await transaction(this.prisma, async (tx) => {
      await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      const count = await tx.feature.count({ where: { code: { in: codes } } });
      if (count !== codes.length)
        throw new BadRequestException({
          success: false,
          errorMessage: '包含未知功能编码',
        });
      await tx.tenantFeature.deleteMany({ where: { tenantId } });
      await tx.tenantFeature.createMany({
        data: codes.map((featureCode) => ({ tenantId, featureCode })),
      });
    });
    return [...codes].sort();
  }

  @AuditAction({
    event: 'menus.update',
    name: '修改菜单',
    targetArg: 0,
    entity: 'menu',
  })
  async updateMenu(code: string, body: UpdateMenuDto) {
    return this.menuDto(
      await transaction(this.prisma, async (tx) => {
        const menu = await tx.menu.findUniqueOrThrow({ where: { code } });
        const parentCode =
          body.parentCode === undefined ? menu.parentCode : body.parentCode;
        if (
          isSystemMenu(menu) &&
          (!body.isActive || parentCode !== menu.parentCode)
        )
          throw new BadRequestException({
            success: false,
            errorMessage: '系统菜单不能停用或调整层级',
          });
        await this.validateParent(tx, menu, parentCode);
        return tx.menu.update({
          where: { code },
          data: {
            name: body.name,
            ...(body.i18nKey !== undefined
              ? { i18nKey: body.i18nKey || null }
              : {}),
            icon: body.icon,
            sortOrder: body.sortOrder,
            isActive: body.isActive,
            parentCode,
          },
        });
      }),
    );
  }

  @AuditAction({
    event: 'menus.delete',
    name: '删除菜单',
    targetArg: 0,
    entity: 'menu',
  })
  async deleteMenu(code: string) {
    await transaction(this.prisma, async (tx) => {
      const menu = await tx.menu.findUniqueOrThrow({ where: { code } });
      if (isSystemMenu(menu))
        throw new BadRequestException({
          success: false,
          errorMessage: '系统菜单不能删除',
        });
      if (await tx.menu.count({ where: { parentCode: code } }))
        throw new ConflictException({
          success: false,
          errorMessage: '请先移动或删除子菜单',
        });
      await tx.menu.delete({ where: { code } });
    });
  }
}
