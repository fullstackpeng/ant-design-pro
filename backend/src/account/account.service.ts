import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from '../auth/password.js';
import type { SessionContext } from '../auth/session-context.js';
import { id, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { AccountAvatar, Prisma } from '../generated/prisma/client.js';
import { StorageProvidersService } from '../storage/storage-providers.service.js';
import type {
  ChangeAccountPasswordDto,
  UpdateAccountProfileDto,
} from './dto/account-request.dto.js';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export interface AccountUpload {
  path: string;
  size: number;
  mimetype: string;
}
const avatarUrl = (version: string) => `/api/account/avatar/${version}`;

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageProvidersService)
    private readonly providers: StorageProvidersService,
  ) {}

  async profile(session: SessionContext) {
    const userId = id(session.userid);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: { select: { version: true } },
      },
    });
    let tenant = null;
    if (session.tenant) {
      const tenantId = id(session.tenant.id);
      const member = await this.prisma.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId, userId } },
        select: {
          role: true,
          tenant: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, name: true, isActive: true } },
          positions: {
            select: {
              position: { select: { id: true, name: true, isActive: true } },
            },
            orderBy: { positionId: 'asc' },
          },
          roles: {
            select: { role: { select: { id: true, name: true } } },
            orderBy: { roleId: 'asc' },
          },
        },
      });
      let department = null;
      if (member.department) {
        const rows = await this.prisma.tenantDepartment.findMany({
          where: { tenantId },
          select: { id: true, name: true, parentId: true },
        });
        const byId = new Map(rows.map((row) => [row.id, row]));
        const names: string[] = [];
        const visited = new Set<bigint>();
        let current = byId.get(member.department.id);
        while (current && !visited.has(current.id)) {
          names.unshift(current.name);
          visited.add(current.id);
          current =
            current.parentId === null ? undefined : byId.get(current.parentId);
        }
        department = { ...member.department, path: names.join(' / ') };
      }
      tenant = {
        ...member.tenant,
        role: member.role,
        department,
        positions: member.positions.map((row) => row.position),
        roles: member.roles.map((row) => row.role),
      };
    }
    return success({
      userId: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar ? avatarUrl(user.avatar.version) : null,
      isPlatformAdmin: session.isPlatformAdmin,
      tenant,
    });
  }

  async updateProfile(session: SessionContext, body: UpdateAccountProfileDto) {
    await this.prisma.user.update({
      where: { id: id(session.userid) },
      data: { name: body.name },
    });
    return success(null);
  }

  async changePassword(
    session: SessionContext,
    token: string | undefined,
    body: ChangeAccountPasswordDto,
  ) {
    const nextHash = await hashPassword(body.newPassword);
    await transaction(this.prisma, async (tx) => {
      await this.requireSession(tx, session, token);
      const user = await tx.user.findUniqueOrThrow({
        where: { id: id(session.userid) },
        select: { passwordHash: true },
      });
      if (!(await verifyPassword(body.currentPassword, user.passwordHash)))
        throw new BadRequestException({
          success: false,
          errorMessage: '当前密码不正确',
        });
      if (body.newPassword === body.currentPassword)
        throw new BadRequestException({
          success: false,
          errorMessage: '新密码不能与当前密码相同',
        });
      await tx.user.update({
        where: { id: id(session.userid) },
        data: { passwordHash: nextHash },
      });
      await tx.session.deleteMany({ where: { userId: id(session.userid) } });
    });
    return success(null);
  }

  async revokeOtherSessions(
    session: SessionContext,
    token: string | undefined,
  ) {
    await transaction(this.prisma, async (tx) => {
      const current = await this.requireSession(tx, session, token);
      await tx.session.deleteMany({
        where: { userId: id(session.userid), tokenHash: { not: current } },
      });
    });
    return success(null);
  }

  private async requireSession(
    tx: Prisma.TransactionClient,
    session: SessionContext,
    token: string | undefined,
  ) {
    const tokenHash = createHash('sha256')
      .update(token ?? '')
      .digest('hex');
    if (
      !(await tx.session.findFirst({
        where: {
          tokenHash,
          userId: id(session.userid),
          expiresAt: { gt: new Date() },
        },
        select: { tokenHash: true },
      }))
    )
      throw new UnauthorizedException({
        success: false,
        errorMessage: '登录已失效，请重新登录',
      });
    return tokenHash;
  }

  async uploadAvatar(session: SessionContext, file?: AccountUpload) {
    if (!file)
      throw new BadRequestException({
        success: false,
        errorMessage: '请选择头像图片',
      });
    try {
      if (!file.size || file.size > MAX_AVATAR_BYTES)
        throw new BadRequestException({
          success: false,
          errorMessage: '头像不能为空且不能超过 2 MB',
        });
      const bytes = await readFile(file.path);
      const type = bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'image/png'
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          ? 'image/jpeg'
          : ['GIF87a', 'GIF89a'].includes(
                bytes.subarray(0, 6).toString('ascii'),
              )
            ? 'image/gif'
            : bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
                bytes.subarray(8, 12).toString('ascii') === 'WEBP'
              ? 'image/webp'
              : null;
      if (!type || type !== file.mimetype)
        throw new BadRequestException({
          success: false,
          errorMessage: '头像仅支持有效的 PNG、JPEG、GIF、WebP 图片',
        });
      const provider = await this.providers.defaultProvider();
      const driver = this.providers.driver(provider);
      const version = randomUUID();
      const objectKey = `accounts/${session.userid}/avatars/${version}`;
      let previous: AccountAvatar | null;
      try {
        await driver.upload({
          key: objectKey,
          body: createReadStream(file.path),
          contentType: type,
          size: file.size,
        });
        previous = await transaction(this.prisma, async (tx) => {
          const userId = id(session.userid);
          const old = await tx.accountAvatar.findUnique({ where: { userId } });
          const data = { version, providerId: provider.id, objectKey };
          await tx.accountAvatar.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
          });
          return old;
        });
      } catch (error) {
        await driver
          .delete(objectKey)
          .catch(() => this.logger.warn('头像上传失败后的存储清理失败'));
        throw error;
      }
      if (previous) await this.cleanupAvatar(previous);
      return success({ url: avatarUrl(version) });
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async removeAvatar(session: SessionContext) {
    const previous = await transaction(this.prisma, async (tx) => {
      const where = { userId: id(session.userid) };
      const current = await tx.accountAvatar.findUnique({ where });
      if (current) await tx.accountAvatar.delete({ where });
      return current;
    });
    if (previous) await this.cleanupAvatar(previous);
    return success(null);
  }

  private async cleanupAvatar(avatar: {
    providerId: bigint;
    objectKey: string;
  }) {
    try {
      const provider = await this.providers.providerById(avatar.providerId);
      await this.providers.driver(provider).delete(avatar.objectKey);
    } catch {
      this.logger.warn('旧头像已解除关联，但存储对象清理失败');
    }
  }

  async avatarUrl(session: SessionContext, version: string) {
    const avatar = await this.prisma.accountAvatar.findFirst({
      where: { userId: id(session.userid), version },
    });
    if (!avatar)
      throw new NotFoundException({
        success: false,
        errorMessage: '头像不存在',
      });
    const provider = await this.providers.providerById(avatar.providerId);
    return this.providers.driver(provider).signDownload(avatar.objectKey, 300);
  }
}
