import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { writeAudit } from './audit-action.js';

@Injectable()
export class AuditCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger('AuditCleanup');
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  start() {
    if (this.timer) return;
    const tick = () => {
      if (this.pending) return;
      this.pending = this.cleanup()
        .catch(() => this.logger.error('日志清理失败'))
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
    try {
      await this.cleanupBatches();
    } catch (error) {
      await writeAudit(
        this.prisma,
        { event: 'audit.retention.cleanup', name: '清理到期审计日志' },
        { requestId: randomUUID(), ip: '', userAgent: '' },
        'failed',
        '自动清理失败，请检查运行日志',
      ).catch(() => this.logger.error('清理失败记录写入失败'));
      throw error;
    }
  }

  private async cleanupBatches() {
    // A transaction-level advisory lock protects multiple worker instances.
    // Bound work per tick; subsequent ticks continue a large backlog.
    let operations = 0;
    let logins = 0;
    for (let batch = 0; batch < 20; batch++) {
      const result = await this.prisma.$transaction(async (tx) => {
        const [lock] = await tx.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(11242026, 1) AS locked`;
        if (!lock?.locked) return null;
        // Policy updates take the same advisory lock; Prisma also qualifies the
        // table for installations that use a non-public database schema.
        const policy = await tx.auditPolicy.findUnique({ where: { id: 1 } });
        if (!policy || policy.operationDays < 1 || policy.loginDays < 1)
          throw new Error('Invalid audit policy');
        const operationCutoff = new Date(
          Date.now() - policy.operationDays * 86400000,
        );
        const loginCutoff = new Date(Date.now() - policy.loginDays * 86400000);
        const oldOperations = await tx.operationLog.findMany({
          where: { createdAt: { lt: operationCutoff } },
          select: { id: true },
          take: 500,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        const oldLogins = await tx.loginLog.findMany({
          where: { createdAt: { lt: loginCutoff } },
          select: { id: true },
          take: 500,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        await tx.operationLog.deleteMany({
          where: { id: { in: oldOperations.map((row) => row.id) } },
        });
        await tx.loginLog.deleteMany({
          where: { id: { in: oldLogins.map((row) => row.id) } },
        });
        if (oldOperations.length || oldLogins.length)
          await writeAudit(
            tx,
            { event: 'audit.retention.cleanup', name: '清理到期审计日志' },
            {
              requestId: randomUUID(),
              ip: '',
              userAgent: '',
              action: {
                changes: [
                  {
                    entity: 'auditRetention',
                    operation: 'cleanup',
                    before: {},
                    after: {
                      operations: oldOperations.length,
                      logins: oldLogins.length,
                    },
                  },
                ],
              },
            },
            'succeeded',
          );
        return { operations: oldOperations.length, logins: oldLogins.length };
      });
      if (!result) break;
      operations += result.operations;
      logins += result.logins;
      if (result.operations < 500 && result.logins < 500) break;
    }
    if (operations || logins)
      this.logger.log(`已清理操作日志 ${operations} 条，登录日志 ${logins} 条`);
  }
}
