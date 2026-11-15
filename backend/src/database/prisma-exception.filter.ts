import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped: Record<string, [number, string]> = {
      P2002: [409, '编码、账号或成员关系已存在'],
      P2025: [404, '记录不存在'],
      P2003: [409, '关联记录不存在或仍在使用中'],
      P2034: [409, '数据发生变化，请重试'],
    };
    const [status, errorMessage] = mapped[error.code] ?? [
      500,
      '数据库操作失败',
    ];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ success: false, errorMessage });
  }
}
