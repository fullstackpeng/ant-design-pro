import { Controller, Get, Header } from '@nestjs/common';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionContext } from '../auth/session-context.js';

@Controller('api/tenant')
export class TenantsController {
  @Get('current')
  @Header('Cache-Control', 'no-store')
  current(@CurrentSession() session: SessionContext) {
    return { success: true, data: { ...session.tenant, role: session.access } };
  }
}
