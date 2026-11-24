import { ConflictException } from '@nestjs/common';
import { writeAudit } from '../audit/audit-action.js';
import { auditClient } from '../audit/audit-client.js';
import { auditContext } from '../audit/audit-context.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from './prisma.service.js';

export async function transaction<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const store = auditContext.getStore();
  const active = store?.action?.closed ? undefined : store?.transaction;
  if (active) return work(active);
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const context = auditContext.getStore();
          const start = context?.action?.changes.length ?? 0;
          try {
            const observed = auditClient(tx);
            const result =
              context?.action && !context.action.closed
                ? await auditContext.run(
                    { ...context, transaction: observed },
                    () => work(observed),
                  )
                : await work(observed);
            if (
              context?.action?.external &&
              context.action.changes.length > start
            )
              await writeAudit(
                tx,
                context.action.external,
                context,
                'accepted',
                '数据库变更已提交，外部操作以最终事件为准',
              );
            return result;
          } catch (error) {
            if (context?.action) context.action.changes.splice(start);
            throw error;
          }
        },
        {
          isolationLevel: 'Serializable',
        },
      );
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
