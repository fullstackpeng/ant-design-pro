import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { writeAudit } from '../../audit/audit-action.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AiRetentionCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger('AiRetention');
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  start() {
    if (this.timer) return;
    const tick = () => {
      if (this.pending) return;
      this.pending = this.cleanup()
        .catch(() => this.logger.error('AI 会话清理失败'))
        .finally(() => {
          this.pending = undefined;
        });
    };
    tick();
    this.timer = setInterval(tick, 3600000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.pending;
  }

  async cleanup() {
    const context = { requestId: randomUUID(), ip: '', userAgent: '' };
    try {
      for (let batch = 0; batch < 20; batch++) {
        const count = await this.prisma.$transaction(async (tx) => {
          const [lock] = await tx.$queryRaw<
            { locked: boolean }[]
          >`SELECT pg_try_advisory_xact_lock(11242026, 2) AS locked`;
          if (!lock?.locked) return 0;
          // Policy service uses the request-routed client only in HTTP actions; read policy in this transaction.
          const policy = await tx.aiPolicy.findUniqueOrThrow({
            where: { id: 1 },
          });
          if (
            policy.conversationRetentionDays < 1 ||
            policy.conversationRetentionDays > 3650
          )
            throw new Error('Invalid AI retention policy');
          const cutoff = new Date(
            Date.now() - policy.conversationRetentionDays * 86400000,
          );
          const old = await tx.aiConversation.findMany({
            where: { updatedAt: { lt: cutoff } },
            select: { id: true },
            orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
            take: 100,
          });
          if (!old.length) return 0;
          const result = await tx.aiConversation.deleteMany({
            where: {
              id: { in: old.map((row) => row.id) },
              updatedAt: { lt: cutoff },
            },
          });
          await writeAudit(
            tx,
            {
              event: 'ai.retention.cleanup',
              name: '清理到期 AI 会话',
              entity: 'aiRetention',
            },
            context,
            'succeeded',
            `已清理 ${result.count} 个到期会话`,
          );
          return result.count;
        });
        if (count < 100) break;
      }
    } catch (error) {
      await writeAudit(
        this.prisma,
        {
          event: 'ai.retention.cleanup',
          name: '清理到期 AI 会话',
          entity: 'aiRetention',
        },
        context,
        'failed',
        'AI 会话清理失败',
      ).catch(() => this.logger.error('AI 清理失败审计写入失败'));
      throw error;
    }
  }
}
