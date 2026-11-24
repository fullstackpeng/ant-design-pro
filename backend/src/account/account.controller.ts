import { tmpdir } from 'node:os';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuditEndpoint } from '../audit/audit-action.js';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import {
  SESSION_COOKIE,
  type SessionContext,
  sessionCookieOptions,
  sessionToken,
} from '../auth/session-context.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  AccountService,
  type AccountUpload,
  MAX_AVATAR_BYTES,
} from './account.service.js';
import {
  AccountAvatarParamDto,
  ChangeAccountPasswordDto,
  UpdateAccountProfileDto,
} from './dto/account-request.dto.js';
import {
  AccountAvatarResponseDto,
  AccountProfileResponseDto,
} from './dto/account-response.dto.js';

@Controller('api/account')
@RequireScope('authenticated')
@ApiTags('account')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(AccountAvatarParamDto)
export class AccountController {
  constructor(
    @Inject(AccountService) private readonly account: AccountService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('profile')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'accountProfile',
    summary: '查询本人资料及当前租户任职',
  })
  @ApiOkResponse({ type: AccountProfileResponseDto })
  profile(
    @CurrentSession() session: SessionContext,
  ): Promise<AccountProfileResponseDto> {
    return this.account.profile(session);
  }

  @AuditEndpoint({ event: 'account.profile.update', name: '修改个人资料' })
  @Patch('profile')
  @ApiOperation({
    operationId: 'updateAccountProfile',
    summary: '修改本人显示名称',
  })
  @ApiBody({ type: UpdateAccountProfileDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  updateProfile(
    @CurrentSession() session: SessionContext,
    @Body() body: UpdateAccountProfileDto,
  ): Promise<EmptyResponseDto> {
    return this.account.updateProfile(session, body);
  }

  @AuditEndpoint({ event: 'account.password.update', name: '修改个人密码' })
  @Post('password')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'changeAccountPassword',
    summary: '修改本人密码并撤销全部会话',
  })
  @ApiBody({ type: ChangeAccountPasswordDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  async password(
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
    @Body() body: ChangeAccountPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EmptyResponseDto> {
    const result = await this.account.changePassword(
      session,
      sessionToken(request),
      body,
    );
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    return result;
  }

  @AuditEndpoint({ event: 'account.sessions.revoke', name: '撤销其他会话' })
  @Post('sessions/revoke-others')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'revokeOtherAccountSessions',
    summary: '撤销本人除当前登录外的全部会话',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  revokeOthers(
    @CurrentSession() session: SessionContext,
    @Req() request: Request,
  ): Promise<EmptyResponseDto> {
    return this.account.revokeOtherSessions(session, sessionToken(request));
  }

  @AuditEndpoint({ event: 'account.avatar.upload', name: '上传头像' })
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: tmpdir(),
      limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    operationId: 'uploadAccountAvatar',
    summary: '上传本人账号头像',
  })
  @ApiCreatedResponse({ type: AccountAvatarResponseDto })
  uploadAvatar(
    @CurrentSession() session: SessionContext,
    @UploadedFile() file?: AccountUpload,
  ): Promise<AccountAvatarResponseDto> {
    return this.account.uploadAvatar(session, file);
  }

  @AuditEndpoint({ event: 'account.avatar.delete', name: '删除头像' })
  @Delete('avatar')
  @ApiOperation({ operationId: 'removeAccountAvatar', summary: '移除本人头像' })
  @ApiOkResponse({ type: EmptyResponseDto })
  removeAvatar(
    @CurrentSession() session: SessionContext,
  ): Promise<EmptyResponseDto> {
    return this.account.removeAvatar(session);
  }

  @AuditEndpoint({ exempt: '资源展示读取，无业务变更' })
  @Get('avatar/:version')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getAccountAvatar',
    summary: '读取本人头像的短时签名地址',
  })
  @ApiFoundResponse({ description: '重定向到头像存储地址' })
  async avatar(
    @CurrentSession() session: SessionContext,
    @Param() params: AccountAvatarParamDto,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(
      302,
      await this.account.avatarUrl(session, params.version),
    );
  }
}
