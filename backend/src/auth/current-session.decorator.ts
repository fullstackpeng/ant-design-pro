import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { SessionRequest } from './session-context.js';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const session = context
      .switchToHttp()
      .getRequest<SessionRequest>().sessionContext;
    if (!session) throw new UnauthorizedException();
    return session;
  },
);
