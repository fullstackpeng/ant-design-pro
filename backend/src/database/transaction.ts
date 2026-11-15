import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from './prisma.service.js';

export async function transaction<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: 'Serializable',
      });
    } catch (error) {
      const conflict = error as {
        code?: string;
        cause?: { originalCode?: string };
      };
      const retryable =
        conflict.code === 'P2034' ||
        conflict.cause?.originalCode === '40001' ||
        conflict.cause?.originalCode === '40P01';
      if (!retryable) throw error;
      if (attempt >= 2)
        throw new ConflictException({
          success: false,
          errorMessage: '数据发生变化，请重试',
        });
    }
  }
}
