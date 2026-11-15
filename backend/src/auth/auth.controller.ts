import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequireScope } from './access-scope.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentSession } from './current-session.decorator.js';
import { Public } from './public.decorator.js';
import {
  SESSION_COOKIE,
  type SessionContext,
  sessionToken,
} from './session-context.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
};

@Controller('api')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login/account')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(body);
    await this.auth.logout(sessionToken(request));
    response.cookie(SESSION_COOKIE, session.token, {
      ...cookieOptions,
      ...(session.remember ? { maxAge: session.maxAge } : {}),
    });
    return { success: true, data: null };
  }

  @Get('currentUser')
  @RequireScope('authenticated')
  @Header('Cache-Control', 'no-store')
  currentUser(@CurrentSession() session: SessionContext) {
    return {
      success: true,
      data: session,
    };
  }

  @Post('login/outLogin')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(sessionToken(request));
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    return { success: true, data: null };
  }
}
