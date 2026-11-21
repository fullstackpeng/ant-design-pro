import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginTenantQueryDto } from './dto/login-tenant-request.dto.js';
import { verifyPassword } from './password.js';
import type { SessionContext } from './session-context.js';

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(body: LoginDto) {
    const { tenantCode, username, password, autoLogin } = body;
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        passwordHash: true,
        isPlatformAdmin: true,
        isActive: true,
      },
    });
    // Derive a key even for unknown users to avoid skipping password verification.
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
    );
    const membership =
      user && valid
        ? await this.prisma.tenantMembership.findFirst({
            where: {
              userId: user.id,
              isActive: true,
              tenant: { code: tenantCode, isActive: true },
            },
            select: { tenantId: true },
          })
        : null;
    const platformLogin =
      tenantCode === 'platform' && user?.isPlatformAdmin === true;
    if (!user?.isActive || !valid || (!membership && !platformLogin)) {
      throw new UnauthorizedException({
        success: false,
        errorCode: 401,
        errorMessage: '租户或账号信息不正确，或无权访问该租户',
      });
    }
    const token = randomBytes(32).toString('hex');
    const maxAge = (autoLogin === true ? 7 * 24 : 12) * 60 * 60 * 1000;
    await this.prisma.session.create({
      data: {
        tokenHash: tokenHash(token),
        userId: user.id,
        tenantId: platformLogin ? null : membership?.tenantId,
        expiresAt: new Date(Date.now() + maxAge),
      },
    });
    return { token, maxAge, remember: autoLogin === true };
  }

  async loginTenants(query: LoginTenantQueryDto) {
    const keyword = query.keyword;
    const data = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        ...(keyword
          ? {
              OR: [
                { code: { contains: keyword, mode: 'insensitive' as const } },
                { name: { contains: keyword, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { code: 'asc' },
      take: query.limit,
      select: { code: true, name: true },
    });
    return { success: true as const, data };
  }

  async currentUser(token: string | undefined): Promise<SessionContext> {
    if (token) {
      const session = await this.prisma.session.findFirst({
        where: {
          tokenHash: tokenHash(token),
          expiresAt: { gt: new Date() },
        },
        select: {
          tenantId: true,
          user: {
            select: {
              id: true,
              name: true,
              isPlatformAdmin: true,
              isActive: true,
            },
          },
          membership: {
            select: {
              role: true,
              isActive: true,
              user: { select: { id: true, name: true } },
              tenant: {
                select: { id: true, code: true, name: true, isActive: true },
              },
            },
          },
        },
      });
      if (session?.user.isActive) {
        if (session.tenantId === null && session.user.isPlatformAdmin) {
          return {
            userid: session.user.id.toString(),
            name: session.user.name,
            access: 'user',
            isPlatformAdmin: true,
            tenant: null,
          };
        }
        const membership = session.membership;
        if (
          membership?.isActive &&
          membership.tenant.isActive &&
          (membership.role === 'admin' || membership.role === 'user')
        ) {
          const { user, tenant, role } = membership;
          return {
            userid: user.id.toString(),
            name: user.name,
            access: role,
            isPlatformAdmin: false,
            tenant: {
              id: tenant.id.toString(),
              code: tenant.code,
              name: tenant.name,
            },
          };
        }
      }
    }
    throw new UnauthorizedException({
      success: false,
      errorCode: 401,
      errorMessage: '请先登录',
    });
  }

  async logout(token: string | undefined) {
    if (token) {
      await this.prisma.session.deleteMany({
        where: { tokenHash: tokenHash(token) },
      });
    }
  }
}
