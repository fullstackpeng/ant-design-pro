import { ConflictException } from '@nestjs/common';
import { hashPassword } from '../auth/password.js';
import type { AccountDto } from '../common/dto/account.dto.js';
import { invalid } from '../common/validation.js';
import type { Prisma } from '../generated/prisma/client.js';

export async function prepareAccount(body: AccountDto) {
  const { username } = body;
  if (body.mode === 'new' && (!body.name || !body.password))
    invalid('新建账号需要姓名和密码');
  return {
    mode: body.mode,
    username,
    create:
      body.mode === 'new' && body.name && body.password
        ? {
            username,
            name: body.name,
            passwordHash: await hashPassword(body.password),
          }
        : null,
  };
}

export async function resolveAccount(
  tx: Prisma.TransactionClient,
  account: Awaited<ReturnType<typeof prepareAccount>>,
) {
  if (account.create) {
    return tx.user.create({ data: account.create, select: { id: true } });
  }
  const user = await tx.user.findUnique({
    where: { username: account.username },
    select: { id: true, isPlatformAdmin: true },
  });
  if (!user || user.isPlatformAdmin) {
    throw new ConflictException({
      success: false,
      errorMessage: '账号不存在或不能加入租户，请确认用户名',
    });
  }
  return user;
}
