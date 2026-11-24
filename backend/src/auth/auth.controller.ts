import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuditEndpoint } from '../audit/audit-action.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import { RequireScope } from './access-scope.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentSession } from './current-session.decorator.js';
import { CurrentUserResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginTenantQueryDto } from './dto/login-tenant-request.dto.js';
import { LoginTenantListResponseDto } from './dto/login-tenant-response.dto.js';
import { Public } from './public.decorator.js';
import {
  sessionCookieOptions as cookieOptions,
  SESSION_COOKIE,
  type SessionContext,
  sessionToken,
} from './session-context.js';

@Controller('api')
@ApiTags('auth')
@ApiErrors()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @AuditEndpoint({ event: 'auth.login', name: '账号登录', kind: 'login' })
  @Post('login/account')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'login', summary: '租户或平台账号登录' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmptyResponseDto> {
    const session = await this.auth.login(body);
    await this.auth.logout(sessionToken(request));
    response.cookie(SESSION_COOKIE, session.token, {
      ...cookieOptions,
      ...(session.remember ? { maxAge: session.maxAge } : {}),
    });
    return { success: true, data: null };
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('login/tenants')
  @Public()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listLoginTenants',
    summary: '查询可用于登录的启用租户',
  })
  @ApiExtraModels(LoginTenantQueryDto)
  @ApiOkResponse({ type: LoginTenantListResponseDto })
  loginTenants(
    @Query() query: LoginTenantQueryDto,
  ): Promise<LoginTenantListResponseDto> {
    return this.auth.loginTenants(query);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('currentUser')
  @RequireScope('authenticated')
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('session')
  @ApiOperation({
    operationId: 'currentUser',
    summary: '获取当前账号及租户上下文',
  })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  currentUser(
    @CurrentSession() session: SessionContext,
  ): CurrentUserResponseDto {
    return {
      success: true,
      data: session,
    };
  }

  @AuditEndpoint({ event: 'auth.logout', name: '主动退出', kind: 'login' })
  @Post('login/outLogin')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'logout', summary: '撤销当前会话' })
  @ApiOkResponse({ type: EmptyResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmptyResponseDto> {
    await this.auth.logoutCurrent(sessionToken(request));
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    return { success: true, data: null };
  }
}
