import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export async function ensureMemberCapacity(
  tx: Prisma.TransactionClient,
  tenantId: bigint,
  additional = 1,
) {
  const subscription = await tx.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  const now = new Date();
  if (
    !subscription?.isActive ||
    subscription.startsAt > now ||
    subscription.expiresAt <= now
  ) {
    throw new ForbiddenException({
      success: false,
      errorMessage: '套餐未生效、已停用或已到期，请联系平台管理员',
    });
  }
  const used = await tx.tenantMembership.count({
    where: { tenantId, isActive: true },
  });
  if (used + additional > subscription.plan.maxMembers) {
    throw new ConflictException({
      success: false,
      errorMessage: '已达到套餐成员上限',
    });
  }
}
