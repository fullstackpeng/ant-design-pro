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
import { AuthService, SESSION_COOKIE } from './auth.service.js';

function sessionToken(request: Request): string | undefined {
  const value: unknown = request.cookies?.[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

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
  @Header('Cache-Control', 'no-store')
  async currentUser(@Req() request: Request) {
    return {
      success: true,
      data: await this.auth.currentUser(sessionToken(request)),
    };
  }

  @Post('login/outLogin')
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
