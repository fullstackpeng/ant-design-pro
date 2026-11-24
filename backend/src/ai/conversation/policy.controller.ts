import { Body, Controller, Get, Header, Inject, Patch } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../../audit/audit-action.js';
import { RequireScope } from '../../auth/access-scope.decorator.js';
import { ApiErrors } from '../../common/dto/response.dto.js';
import { UpdateAiPolicyDto } from './dto/policy-request.dto.js';
import { AiPolicyDtoResponse } from './dto/policy-response.dto.js';
import { AiPolicyService } from './policy.service.js';

@Controller('api/platform/ai/policy')
@RequireScope('platform')
@ApiTags('ai-admin')
@ApiCookieAuth('session')
@ApiErrors()
export class AiPolicyController {
  constructor(
    @Inject(AiPolicyService) private readonly policy: AiPolicyService,
  ) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @AuditEndpoint({ exempt: 'AI 业务配置及授权查询' })
  @ApiOperation({
    operationId: 'getAiPolicy',
    summary: '查询会话保留策略',
  })
  @ApiOkResponse({ type: AiPolicyDtoResponse })
  get(): Promise<AiPolicyDtoResponse> {
    return this.policy.get();
  }
  @Patch()
  @AuditEndpoint({ event: 'ai.policy.update', name: '修改 AI 会话保留策略' })
  @ApiOperation({
    operationId: 'updateAiPolicy',
    summary: '修改会话保留策略',
  })
  @ApiBody({ type: UpdateAiPolicyDto })
  @ApiOkResponse({ type: AiPolicyDtoResponse })
  update(@Body() body: UpdateAiPolicyDto): Promise<AiPolicyDtoResponse> {
    return this.policy.update(body);
  }
}
