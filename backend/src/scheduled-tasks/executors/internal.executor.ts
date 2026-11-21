import { setTimeout } from 'node:timers/promises';
import { Inject, Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { invalid } from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Executor, TaskContext, TaskSnapshot } from '../task.types.js';

const handlers = [
  {
    code: 'system.ping',
    name: '系统连通性检查',
    scopes: ['global', 'tenant'],
    feature: null,
  },
  {
    code: 'tenant.dictionary-summary',
    name: '租户字典统计',
    scopes: ['tenant'],
    feature: 'dictionaries',
  },
];

@Injectable()
export class InternalExecutor implements Executor {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  catalog() {
    return handlers;
  }

  validate(handler: string, scope: string, params: Record<string, unknown>) {
    const definition = handlers.find((item) => item.code === handler);
    if (!definition) invalid('内部任务处理器未注册');
    if (!definition.scopes.includes(scope === 'global' ? 'global' : 'tenant'))
      invalid('处理器不支持该作用范围');
    const keys = Object.keys(params);
    if (handler === 'system.ping') {
      if (
        keys.some((key) => !['message', 'delayMs'].includes(key)) ||
        (params.message !== undefined &&
          (typeof params.message !== 'string' ||
            params.message.length > 200)) ||
        (params.delayMs !== undefined &&
          (typeof params.delayMs !== 'number' ||
            !Number.isInteger(params.delayMs) ||
            params.delayMs < 0 ||
            params.delayMs > 5000))
      )
        invalid(
          '连通性检查参数仅支持 message（最多200字）和 delayMs（0–5000整数）',
        );
    } else if (keys.length) invalid('租户字典统计不接受额外参数');
  }

  async execute(snapshot: TaskSnapshot, context: TaskContext) {
    this.validate(snapshot.handler, snapshot.scope, snapshot.params);
    context.signal.throwIfAborted();
    if (snapshot.handler === 'system.ping') {
      await setTimeout(Number(snapshot.params.delayMs ?? 0), undefined, {
        signal: context.signal,
      });
      return {
        message: snapshot.params.message ?? 'pong',
        tenantId: context.tenantId?.toString() ?? null,
      };
    }
    if (context.tenantId === null)
      throw new UnrecoverableError('需要明确的租户身份');
    const enabled = await this.prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureCode: {
          tenantId: context.tenantId,
          featureCode: 'dictionaries',
        },
      },
    });
    if (!enabled) throw new UnrecoverableError('租户未开通字典功能');
    const [types, items] = await this.prisma.$transaction([
      this.prisma.dictionaryType.count({
        where: { tenantId: context.tenantId },
      }),
      this.prisma.dictionaryItem.count({
        where: { tenantId: context.tenantId },
      }),
    ]);
    context.signal.throwIfAborted();
    return { tenantId: context.tenantId.toString(), types, items };
  }
}
