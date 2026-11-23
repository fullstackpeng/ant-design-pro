import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  CreateMemberDto,
  MemberQueryDto,
  UpdateMemberDto,
} from './dto/member-request.dto.js';
import {
  MemberListResponseDto,
  MemberOrganizationOptionsResponseDto,
  SubscriptionUsageResponseDto,
} from './dto/member-response.dto.js';
import { MembersService } from './members.service.js';

@Controller('api/tenant')
@RequireScope('tenant')
@ApiTags('members')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, MemberQueryDto)
export class MembersController {
  constructor(
    @Inject(MembersService) private readonly members: MembersService,
  ) {}

  @Get('members')
  @RequirePermission('members:read')
  @RequireFeature('members')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listMembers', summary: '分页查询当前租户成员' })
  @ApiOkResponse({ type: MemberListResponseDto })
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: MemberQueryDto,
  ): Promise<MemberListResponseDto> {
    return this.members.list(session, query);
  }

  @Get('members/organization-options')
  @RequirePermission('members:read')
  @RequireFeature('members')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'memberOrganizationOptions',
    summary: '查询成员部门与岗位选项',
  })
  @ApiOkResponse({ type: MemberOrganizationOptionsResponseDto })
  organizationOptions(
    @CurrentSession() session: SessionContext,
  ): Promise<MemberOrganizationOptionsResponseDto> {
    return this.members.organizationOptions(session);
  }

  @Post('members')
  @RequirePermission('members:create')
  @RequireFeature('members')
  @ApiOperation({
    operationId: 'addMember',
    summary: '添加已有账号或创建新成员',
  })
  @ApiBody({ type: CreateMemberDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  add(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateMemberDto,
  ): Promise<EmptyResponseDto> {
    return this.members.add(session, body);
  }

  @Patch('members/:id')
  @RequirePermission('members:update')
  @RequireFeature('members')
  @ApiOperation({ operationId: 'updateMember', summary: '调整成员角色与状态' })
  @ApiBody({ type: UpdateMemberDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdateMemberDto,
  ): Promise<EmptyResponseDto> {
    return this.members.update(session, params.id, body);
  }

  @Delete('members/:id')
  @RequirePermission('members:delete')
  @RequireFeature('members')
  @ApiOperation({
    operationId: 'removeMember',
    summary: '移除成员，保留全局账号',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.members.remove(session, params.id);
  }

  @Get('subscription')
  @RequireScope('tenant')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'subscriptionInfo',
    summary: '查询当前租户订阅与成员用量',
  })
  @ApiOkResponse({ type: SubscriptionUsageResponseDto })
  subscription(
    @CurrentSession() session: SessionContext,
  ): Promise<SubscriptionUsageResponseDto> {
    return this.members.subscription(session);
  }
}
