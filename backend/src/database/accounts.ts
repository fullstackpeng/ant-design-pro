import { ConflictException } from '@nestjs/common';
import { hashPassword } from '../auth/password.js';
import { bodyObject, invalid, password, text } from '../common/validation.js';
import type { Prisma } from '../generated/prisma/client.js';

export async function prepareAccount(value: unknown) {
  const body = bodyObject(value);
  const username = text(body.username, '用户名', 64);
  if (body.mode !== 'existing' && body.mode !== 'new')
    invalid('请选择已有账号或新建账号');
  return {
    mode: body.mode,
    username,
    create:
      body.mode === 'new'
        ? {
            username,
            name: text(body.name, '姓名'),
            passwordHash: await hashPassword(password(body.password)),
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
