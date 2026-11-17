import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import { id } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Menu, Prisma } from '../generated/prisma/client.js';
import type { CreateMenuDto, UpdateMenuDto } from './navigation.dto.js';
import {
  directoryPaths,
  isSystemMenu,
  registeredPages,
} from './page-registry.js';

@Injectable()
export class NavigationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async requireFeature(session: SessionContext, featureCode: string) {
    if (
      !session.tenant ||
      !(await this.prisma.tenantFeature.findUnique({
        where: {
          tenantId_featureCode: {
            tenantId: id(session.tenant.id),
            featureCode,
          },
        },
      }))
    )
      throw new ForbiddenException({
        success: false,
        errorMessage: '当前租户未开通该功能',
      });
  }

  async current(session: SessionContext) {
    const features = session.tenant
      ? await this.tenantFeatures(session.tenant.id)
      : [];
    const rows = await this.prisma.menu.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    const pages = registeredPages.filter(
      (page) =>
        (page.scope === 'authenticated' ||
          page.scope === (session.tenant ? 'tenant' : 'platform')) &&
        (page.minRole === 'user' || session.access === 'admin') &&
        (!page.featureCode || features.includes(page.featureCode)),
    );
    const candidates = rows.filter(
      (menu) =>
        menu.isActive &&
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
    const permissions =
      features.includes('members') && session.access === 'admin'
        ? ['members:read', 'members:create', 'members:update', 'members:delete']
        : [];
    const allowedPaths = [
      ...pages.map((page) => page.path),
      ...directoryPaths.filter((path) =>
        pages.some((page) => page.path.startsWith(`${path}/`)),
      ),
    ];
    return { menus, allowedPaths, permissions };
  }

  features() {
    return this.prisma.feature.findMany({ orderBy: { code: 'asc' } });
  }
  async menus() {
    const rows = await this.prisma.menu.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    return rows.map((menu) => this.menuDto(menu));
  }

  pages() {
    return registeredPages;
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

  async createMenu(body: CreateMenuDto) {
    const page =
      body.kind === 'page'
        ? registeredPages.find((page) => page.code === body.pageCode)
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

  async tenantFeatures(tenant: string) {
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
            icon: body.icon,
            sortOrder: body.sortOrder,
            isActive: body.isActive,
            parentCode,
          },
        });
      }),
    );
  }

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
