import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { writeAudit } from './audit-action.js';
import { type AuditContext, auditContext } from './audit-context.js';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  use(request: Request, response: Response, next: NextFunction) {
    const context: AuditContext = {
      requestId: randomUUID(),
      ip: request.ip ?? request.socket.remoteAddress ?? '',
      userAgent: request.get('user-agent') ?? '',
      attemptedAccount:
        typeof request.body?.username === 'string'
          ? request.body.username.slice(0, 64)
          : '',
      attemptedTenant:
        typeof request.body?.tenantCode === 'string'
          ? request.body.tenantCode.slice(0, 64)
          : '',
    };
    response.setHeader('X-Request-ID', context.requestId);
    response.once('finish', () => {
      if (
        response.statusCode < 400 ||
        context.failureRecorded ||
        !context.endpoint
      )
        return;
      context.recorded = true;
      void auditContext
        .exit(() =>
          writeAudit(
            this.prisma,
            context.endpoint as NonNullable<AuditContext['endpoint']>,
            context,
            response.statusCode === 403 ? 'denied' : 'failed',
            response.statusCode === 401
              ? '认证失败或会话失效'
              : response.statusCode === 403
                ? '权限不足'
                : '请求校验或处理失败',
          ),
        )
        .catch(() =>
          new Logger('Audit').error(
            `Audit persistence failed: ${context.requestId}`,
          ),
        );
    });
    auditContext.run(context, next);
  }
}
