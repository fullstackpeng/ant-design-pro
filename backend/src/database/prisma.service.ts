import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { writeAudit } from '../audit/audit-action.js';
import { auditClient } from '../audit/audit-client.js';
import { auditContext } from '../audit/audit-context.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { createPrismaAdapter } from './prisma.factory.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  constructor() {
    super({ adapter: createPrismaAdapter() });
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}

// Nest keeps PrismaService as the injection token; the factory adds request-local
// transaction routing without changing generated Prisma clients.
export function createAuditedPrismaService(): PrismaService {
  const client = new PrismaService();
  const observed = auditClient(client, async (model, operation, args) => {
    const context = auditContext.getStore();
    return client.$transaction(async (raw) => {
      const tx = auditClient(raw);
      return auditContext.run(
        {
          ...context,
          requestId: context?.requestId ?? '',
          ip: context?.ip ?? '',
          userAgent: context?.userAgent ?? '',
          transaction: tx,
        },
        async () => {
          const result = await Reflect.get(
            Reflect.get(tx, model),
            operation,
          )(args);
          if (context?.action?.external)
            await writeAudit(
              raw,
              context.action.external,
              context,
              'accepted',
              '数据库变更已提交，外部操作以最终事件为准',
            );
          return result;
        },
      );
    });
  });
  return new Proxy(client, {
    get(target, property) {
      const context = auditContext.getStore();
      const tx = context?.action?.closed ? undefined : context?.transaction;
      if (tx && property === '$transaction') {
        return (work: unknown) =>
          typeof work === 'function'
            ? work(tx)
            : Promise.all(work as Promise<unknown>[]);
      }
      if (
        tx &&
        typeof property === 'string' &&
        (!property.startsWith('$') ||
          [
            '$queryRaw',
            '$executeRaw',
            '$queryRawUnsafe',
            '$executeRawUnsafe',
          ].includes(property)) &&
        property in tx
      ) {
        const value = Reflect.get(tx, property);
        return typeof value === 'function' ? value.bind(tx) : value;
      }
      const value = Reflect.get(
        context?.action && !context.action.closed ? observed : target,
        property,
      );
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
