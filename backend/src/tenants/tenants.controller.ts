import { Controller, ForbiddenException, Get, Header } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../audit/audit-action.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { ApiErrors } from '../common/dto/response.dto.js';
import { CurrentTenantResponseDto } from './dto/member-response.dto.js';

@Controller('api/tenant')
@ApiTags('members')
@ApiCookieAuth('session')
@ApiErrors()
export class TenantsController {
  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('current')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'currentTenant', summary: '获取当前租户身份' })
  @ApiOkResponse({ type: CurrentTenantResponseDto })
  current(@CurrentSession() session: SessionContext): CurrentTenantResponseDto {
    if (!session.tenant) throw new ForbiddenException();
    return { success: true, data: { ...session.tenant, role: session.access } };
  }
}
