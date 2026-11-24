import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import { hashPassword } from '../auth/password.js';
import { id, json, pagination, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user-request.dto.js';
@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async list(query: UserQueryDto) {
    const where = query.keyword
      ? {
          OR: [
            { username: { contains: query.keyword } },
            { name: { contains: query.keyword } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          username: true,
          name: true,
          isActive: true,
          isPlatformAdmin: true,
          memberships: {
            select: {
              tenantId: true,
              role: true,
              isActive: true,
              tenant: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      success: true as const,
      total,
      data: json(
        rows.map((row) => ({
          ...row,
          memberships: row.memberships.map((m) => ({
            tenantId: m.tenantId,
            tenantName: m.tenant.name,
            role: m.role,
            isActive: m.isActive,
          })),
        })),
      ),
    };
  }
  @AuditAction({ event: 'users.create', name: '创建账号', entity: 'user' })
  async create(body: CreateUserDto) {
    const passwordHash = await hashPassword(body.password);
    await transaction(this.prisma, async (tx) => {
      if (await tx.user.findUnique({ where: { username: body.username } }))
        throw new ConflictException({
          success: false,
          errorMessage: '用户名已存在',
        });
      await tx.user.create({
        data: { username: body.username, name: body.name, passwordHash },
      });
    });
    return success(null);
  }
  @AuditAction({
    event: 'users.update',
    name: '修改账号',
    targetArg: 0,
    entity: 'user',
  })
  async update(userId: string, body: UpdateUserDto) {
    await transaction(this.prisma, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: id(userId) },
      });
      if (!body.isActive && user.isActive) {
        if (
          user.isPlatformAdmin &&
          (await tx.user.count({
            where: { isPlatformAdmin: true, isActive: true },
          })) <= 1
        )
          throw new ConflictException({
            success: false,
            errorMessage: '必须保留至少一名启用的平台管理员',
          });
        const memberships = await tx.tenantMembership.findMany({
          where: { userId: user.id, role: 'admin', isActive: true },
        });
        for (const member of memberships) {
          if (
            (await tx.tenantMembership.count({
              where: {
                tenantId: member.tenantId,
                role: 'admin',
                isActive: true,
                user: { isActive: true },
              },
            })) <= 1
          )
            throw new ConflictException({
              success: false,
              errorMessage:
                '该账号是租户最后一名有效管理员，请先交接管理员身份',
            });
        }
        await tx.session.deleteMany({ where: { userId: user.id } });
      }
      await tx.user.update({ where: { id: user.id }, data: body });
    });
    return success(null);
  }
  @AuditAction({
    event: 'users.password.reset',
    name: '重置账号密码',
    targetArg: 0,
    entity: 'user',
  })
  async reset(userId: string, password: string) {
    const passwordHash = await hashPassword(password);
    await transaction(this.prisma, async (tx) => {
      await tx.user.update({
        where: { id: id(userId) },
        data: { passwordHash },
      });
      await tx.session.deleteMany({ where: { userId: id(userId) } });
    });
    return success(null);
  }
}
