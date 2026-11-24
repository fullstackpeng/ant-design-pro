import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import type { SessionContext } from '../auth/session-context.js';
import type { PaginationQueryDto } from '../common/dto/request.dto.js';
import { id, json, pagination, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { SiteSettings } from '../generated/prisma/client.js';
import type { UpdateSiteSettingsDto } from './dto/settings-request.dto.js';
import type { SiteSettingsAuditDto } from './dto/settings-response.dto.js';

function publicSettings(settings: SiteSettings) {
  const {
    title,
    logo,
    loginBackground,
    footerText,
    colorPrimary,
    defaultLocale,
  } = settings;
  return {
    title,
    logo,
    loginBackground,
    footerText,
    colorPrimary,
    defaultLocale,
  };
}
function snapshot(settings: SiteSettings) {
  return { ...publicSettings(settings), revision: settings.revision };
}

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async publicSettings() {
    return success(
      publicSettings(
        await this.prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
      ),
    );
  }

  async get() {
    return success(
      snapshot(
        await this.prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
      ),
    );
  }

  @AuditAction({
    event: 'settings.update',
    name: '修改系统配置',
    entity: 'siteSettings',
  })
  async update(session: SessionContext, body: UpdateSiteSettingsDto) {
    return success(
      await transaction(this.prisma, async (tx) => {
        const before = await tx.siteSettings.findUniqueOrThrow({
          where: { id: 1 },
        });
        if (before.revision !== body.revision)
          throw new ConflictException({
            success: false,
            errorMessage: '配置已被其他管理员修改，请刷新后重新编辑',
          });
        const after = await tx.siteSettings.update({
          where: { id: 1 },
          data: {
            title: body.title,
            logo: body.logo,
            loginBackground: body.loginBackground,
            footerText: body.footerText,
            colorPrimary: body.colorPrimary,
            defaultLocale: body.defaultLocale,
            revision: { increment: 1 },
          },
        });
        await tx.siteSettingsAudit.create({
          data: {
            actorId: id(session.userid),
            actorName: session.name,
            before: snapshot(before),
            after: snapshot(after),
          },
        });
        return snapshot(after);
      }),
    );
  }

  async history(query: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.siteSettingsAudit.findMany({
        ...pagination(query),
        orderBy: { id: 'desc' },
      }),
      this.prisma.siteSettingsAudit.count(),
    ]);
    // Audit snapshots are written exclusively by update(), with the same typed projection.
    const data = json(rows) as unknown as SiteSettingsAuditDto[];
    return { success: true as const, data, total };
  }
}
