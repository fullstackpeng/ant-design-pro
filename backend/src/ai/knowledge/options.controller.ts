import { Controller, Get, Header } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../../audit/audit-action.js';
import { RequireScope } from '../../auth/access-scope.decorator.js';
import { registeredPages } from '../../auth/page-registry.js';
import { permissionCatalog } from '../../auth/permissions.js';
import { ApiErrors } from '../../common/dto/response.dto.js';
import { success } from '../../common/validation.js';
import { AiOptionsResponse } from './dto/options-response.dto.js';

@Controller('api/platform/ai/options')
@RequireScope('platform')
@ApiTags('ai-admin')
@ApiCookieAuth('session')
@ApiErrors()
export class AiOptionsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: '平台配置使用的注册权限和页面目录查询' })
  @ApiOperation({
    operationId: 'getAiOptions',
    summary: '查询 AI 知识权限和导航选项',
  })
  @ApiOkResponse({ type: AiOptionsResponse })
  get(): AiOptionsResponse {
    return success({
      permissions: permissionCatalog.map((p) => ({
        value: p.code,
        label: `${p.name} (${p.code})`,
      })),
      pages: registeredPages
        .filter((p) => p.scope !== 'platform')
        .map((p) => ({ value: p.code, label: `${p.name} (${p.path})` })),
    });
  }
}
