import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import type { SessionContext } from '../auth/session-context.js';
import {
  pagination,
  id as parseId,
  tenantId as sessionTenantId,
} from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  CreateNotificationDto,
  InboxQueryDto,
  NotificationQueryDto,
} from './dto/notification-request.dto.js';
import type { NotificationDto } from './dto/notification-response.dto.js';
import type { NotificationSource } from './notifications.constants.js';

const HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'div',
    'span',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'figure',
    'figcaption',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'style'],
  },
  allowedSchemes: ['http', 'https'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-fA-F]{3}$/, /^#[0-9a-fA-F]{6}$/, /^rgb\([\d\s,]+\)$/],
      'background-color': [
        /^#[0-9a-fA-F]{3}$/,
        /^#[0-9a-fA-F]{6}$/,
        /^rgb\([\d\s,]+\)$/,
      ],
      'font-size': [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      'font-weight': [/^(?:normal|bold|[1-9]00)$/],
      'font-style': [/^(?:normal|italic|oblique)$/],
      'text-decoration': [/^(?:none|underline|line-through)$/],
      'text-align': [/^(?:left|center|right|justify)$/],
      width: [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      height: [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      'max-width': [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
    },
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
  },
  disallowedTagsMode: 'discard',
};

type NotificationRow = Prisma.NotificationGetPayload<{
  include: {
    targetTenants: { select: { tenantId: true } };
    targetMembers: { select: { userId: true } };
    reads: { select: { readAt: true } };
  };
}>;

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function mapNotification(row: NotificationRow): NotificationDto {
  return {
    id: row.id.toString(),
    source: row.source,
    type: row.type,
    title: row.title,
    contentHtml: row.contentHtml,
    isActive: row.isActive,
    publishAt: toIso(row.publishAt),
    expireAt: toIso(row.expireAt),
    readAt: toIso(row.reads[0]?.readAt ?? null),
    targetTenantIds: row.targetTenants.map((item) => item.tenantId.toString()),
    targetUserIds: row.targetMembers.map((item) => item.userId.toString()),
    creatorName: row.creatorName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private includeFor(userId: bigint) {
    return {
      targetTenants: { select: { tenantId: true } },
      targetMembers: { select: { userId: true } },
      reads: { where: { userId }, take: 1, select: { readAt: true } },
    } as const;
  }

  private cleanContent(html: string) {
    const cleaned = sanitizeHtml(html, HTML_OPTIONS);
    if (!cleaned.replace(/<[^>]*>/g, '').trim())
      throw new BadRequestException({
        success: false,
        errorMessage: '正文内容不能为空',
      });
    return cleaned;
  }

  private parseDate(value: string | undefined) {
    return value ? new Date(value) : null;
  }

  private validatePeriod(body: CreateNotificationDto) {
    const publishAt = this.parseDate(body.publishAt);
    const expireAt = this.parseDate(body.expireAt);
    if (publishAt && expireAt && expireAt <= publishAt)
      throw new BadRequestException({
        success: false,
        errorMessage: '失效时间必须晚于发布时间',
      });
    return { publishAt, expireAt };
  }

  private async validateTargets(
    body: CreateNotificationDto,
    source: NotificationSource,
    tenant: bigint | undefined,
  ) {
    const tenantIds = body.targetTenantIds ?? [];
    const userIds = body.targetUserIds ?? [];
    if (body.type === 'announcement') {
      if (tenantIds.length || userIds.length)
        throw new BadRequestException({
          success: false,
          errorMessage: '公告面向全部接收者，不能设置定向目标',
        });
      return { tenantIds: [] as bigint[], userIds: [] as bigint[] };
    }
    if (source === 'platform') {
      if (!tenantIds.length)
        throw new BadRequestException({
          success: false,
          errorMessage: '通知至少需要选择一个目标租户',
        });
      const found = await this.prisma.tenant.count({
        where: { id: { in: tenantIds.map(parseId) } },
      });
      if (found !== tenantIds.length)
        throw new BadRequestException({
          success: false,
          errorMessage: '目标租户不存在',
        });
      return { tenantIds: tenantIds.map(parseId), userIds: [] as bigint[] };
    }
    if (!userIds.length)
      throw new BadRequestException({
        success: false,
        errorMessage: '通知至少需要选择一个目标成员',
      });
    const found = await this.prisma.tenantMembership.count({
      where: {
        tenantId: tenant,
        userId: { in: userIds.map(parseId) },
        isActive: true,
      },
    });
    if (found !== userIds.length)
      throw new BadRequestException({
        success: false,
        errorMessage: '目标成员不存在或已停用',
      });
    return { tenantIds: [] as bigint[], userIds: userIds.map(parseId) };
  }

  private async findOwned(
    value: string,
    source: NotificationSource,
    tenant: bigint | undefined,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const row = await tx.notification.findFirst({
      where: {
        id: parseId(value),
        source,
        ...(tenant === undefined ? {} : { tenantId: tenant }),
      },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '通知公告不存在',
      });
    return row;
  }

  private sourceWhere(
    source: NotificationSource,
    tenant: bigint | undefined,
    query: NotificationQueryDto,
  ): Prisma.NotificationWhereInput {
    return {
      source,
      ...(tenant === undefined ? {} : { tenantId: tenant }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.keyword
        ? { title: { contains: query.keyword, mode: 'insensitive' as const } }
        : {}),
    };
  }

  private async page(
    where: Prisma.NotificationWhereInput,
    query: NotificationQueryDto,
    userId: bigint,
  ) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'desc' },
        include: this.includeFor(userId),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      success: true as const,
      data: rows.map(mapNotification),
      total,
      unreadTotal: 0,
    };
  }

  async platformList(query: NotificationQueryDto, session: SessionContext) {
    return this.page(
      this.sourceWhere('platform', undefined, query),
      query,
      parseId(session.userid),
    );
  }

  async tenantList(session: SessionContext, query: NotificationQueryDto) {
    return this.page(
      this.sourceWhere('tenant', sessionTenantId(session), query),
      query,
      parseId(session.userid),
    );
  }

  async platformDetail(value: string, session: SessionContext) {
    const row = await this.prisma.notification.findFirst({
      where: { id: parseId(value), source: 'platform' },
      include: this.includeFor(parseId(session.userid)),
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '通知公告不存在',
      });
    return { success: true as const, data: mapNotification(row) };
  }

  async tenantDetail(session: SessionContext, value: string) {
    const row = await this.prisma.notification.findFirst({
      where: {
        id: parseId(value),
        source: 'tenant',
        tenantId: sessionTenantId(session),
      },
      include: this.includeFor(parseId(session.userid)),
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '通知公告不存在',
      });
    return { success: true as const, data: mapNotification(row) };
  }

  private async write(
    session: SessionContext,
    body: CreateNotificationDto,
    source: NotificationSource,
    tenant: bigint | undefined,
    value?: string,
  ) {
    const targets = await this.validateTargets(body, source, tenant);
    const { publishAt, expireAt } = this.validatePeriod(body);
    const contentHtml = this.cleanContent(body.contentHtml);
    const actorId = parseId(session.userid);
    await transaction(this.prisma, async (tx) => {
      const existing = value
        ? await this.findOwned(value, source, tenant, tx)
        : undefined;
      const data = {
        type: body.type,
        title: body.title,
        contentHtml,
        isActive: body.isActive,
        publishAt,
        expireAt,
      };
      if (existing) {
        await tx.notification.update({ where: { id: existing.id }, data });
        await tx.notificationTargetTenant.deleteMany({
          where: { notificationId: existing.id },
        });
        await tx.notificationTargetMember.deleteMany({
          where: { notificationId: existing.id },
        });
      }
      const notificationId =
        existing?.id ??
        (
          await tx.notification.create({
            data: {
              ...data,
              source,
              tenantId: tenant ?? null,
              creatorId: actorId,
              creatorName: session.name.slice(0, 100),
            },
            select: { id: true },
          })
        ).id;
      if (targets.tenantIds.length)
        await tx.notificationTargetTenant.createMany({
          data: targets.tenantIds.map((targetTenantId) => ({
            notificationId,
            tenantId: targetTenantId,
          })),
        });
      if (targets.userIds.length)
        await tx.notificationTargetMember.createMany({
          data: targets.userIds.map((userId) => ({ notificationId, userId })),
        });
    });
    return { success: true as const, data: null };
  }

  createPlatform(session: SessionContext, body: CreateNotificationDto) {
    return this.write(session, body, 'platform', undefined);
  }

  updatePlatform(
    session: SessionContext,
    value: string,
    body: CreateNotificationDto,
  ) {
    return this.write(session, body, 'platform', undefined, value);
  }

  createTenant(session: SessionContext, body: CreateNotificationDto) {
    return this.write(session, body, 'tenant', sessionTenantId(session));
  }

  updateTenant(
    session: SessionContext,
    value: string,
    body: CreateNotificationDto,
  ) {
    return this.write(session, body, 'tenant', sessionTenantId(session), value);
  }

  async remove(
    value: string,
    source: NotificationSource,
    tenant: bigint | undefined,
  ) {
    await transaction(this.prisma, async (tx) => {
      const row = await this.findOwned(value, source, tenant, tx);
      await tx.notification.delete({ where: { id: row.id } });
    });
    return { success: true as const, data: null };
  }

  private inboxWhere(session: SessionContext): Prisma.NotificationWhereInput {
    if (!session.tenant)
      throw new ForbiddenException({
        success: false,
        errorMessage: '仅租户会话可以读取消息',
      });
    const tenant = sessionTenantId(session);
    const userId = parseId(session.userid);
    const now = new Date();
    return {
      isActive: true,
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
        {
          OR: [
            { source: 'platform', type: 'announcement' },
            {
              source: 'platform',
              type: 'notice',
              targetTenants: { some: { tenantId: tenant } },
            },
            { source: 'tenant', type: 'announcement', tenantId: tenant },
            {
              source: 'tenant',
              type: 'notice',
              tenantId: tenant,
              targetMembers: { some: { userId } },
            },
          ],
        },
      ],
    };
  }

  async inbox(session: SessionContext, query: InboxQueryDto) {
    const base = this.inboxWhere(session);
    const type = query.type ? { type: query.type } : {};
    const read =
      query.status === 'unread'
        ? { reads: { none: { userId: parseId(session.userid) } } }
        : query.status === 'read'
          ? { reads: { some: { userId: parseId(session.userid) } } }
          : {};
    const where: Prisma.NotificationWhereInput = { AND: [base, type, read] };
    const unreadWhere: Prisma.NotificationWhereInput = {
      AND: [
        base,
        type,
        { reads: { none: { userId: parseId(session.userid) } } },
      ],
    };
    const [rows, total, unreadTotal] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'desc' },
        include: this.includeFor(parseId(session.userid)),
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: unreadWhere }),
    ]);
    return {
      success: true as const,
      data: rows.map(mapNotification),
      total,
      unreadTotal,
    };
  }

  async markRead(session: SessionContext, value: string) {
    const userId = parseId(session.userid);
    const where: Prisma.NotificationWhereInput = {
      AND: [this.inboxWhere(session), { id: parseId(value) }],
    };
    const row = await this.prisma.notification.findFirst({
      where,
      select: { id: true },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '消息不存在或无权访问',
      });
    await this.prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: row.id, userId } },
      create: { notificationId: row.id, userId },
      update: { readAt: new Date() },
    });
    return { success: true as const, data: null };
  }

  async markAllRead(session: SessionContext) {
    const userId = parseId(session.userid);
    const rows = await this.prisma.notification.findMany({
      where: {
        AND: [this.inboxWhere(session), { reads: { none: { userId } } }],
      },
      select: { id: true },
    });
    if (rows.length)
      await this.prisma.notificationRead.createMany({
        data: rows.map((row) => ({ notificationId: row.id, userId })),
        skipDuplicates: true,
      });
    return { success: true as const, data: null };
  }
}
