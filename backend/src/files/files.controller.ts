import { tmpdir } from 'node:os';
import {
  type ArgumentsHost,
  Catch,
  Controller,
  Delete,
  type ExceptionFilter,
  Get,
  Header,
  HttpException,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseFilters,
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
import type { Response } from 'express';
import { AuditEndpoint } from '../audit/audit-action.js';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { FileQueryDto, PlatformFileQueryDto } from './dto/file-request.dto.js';
import {
  FileDownloadResponseDto,
  FileListResponseDto,
  FileUsageResponseDto,
  NotificationAssetResponseDto,
  SiteAssetResponseDto,
} from './dto/file-response.dto.js';
import { FILES_FEATURE, MAX_UPLOAD_BYTES } from './files.constants.js';
import {
  type UploadedFile as DiskFile,
  FilesService,
} from './files.service.js';

// Multer rejects oversized bodies before the handler runs; map that to 413
// instead of the default internal error response.
@Catch()
export class UploadExceptionFilter implements ExceptionFilter {
  private readonly http = new HttpExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException)
      return this.http.catch(exception, host);
    const response = host.switchToHttp().getResponse<Response>();
    const code = (exception as { code?: string }).code;
    const status = code === 'LIMIT_FILE_SIZE' ? 413 : 500;
    response.status(status).json({
      success: false,
      errorCode: status,
      errorMessage: status === 413 ? '文件超过允许的大小上限' : '文件上传失败',
    });
  }
}

const uploadOptions = {
  dest: tmpdir(),
  defParamCharset: 'utf8',
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
};

const uploadBody = {
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
    required: ['file'],
  },
};

@Controller('api/tenant/files')
@RequireScope('tenant')
@RequireFeature(FILES_FEATURE)
@ApiTags('files')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, FileQueryDto)
export class TenantFilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @RequirePermission('files:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'listFiles', summary: '分页查询本租户文件' })
  @ApiOkResponse({ type: FileListResponseDto })
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: FileQueryDto,
  ): Promise<FileListResponseDto> {
    return this.files.tenantList(session, query);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('usage')
  @RequirePermission('files:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'getFileUsage', summary: '查询租户存储用量' })
  @ApiOkResponse({ type: FileUsageResponseDto })
  usage(
    @CurrentSession() session: SessionContext,
  ): Promise<FileUsageResponseDto> {
    return this.files.tenantUsage(session);
  }

  @AuditEndpoint({ event: 'files.upload', name: '上传租户文件' })
  @Post()
  @RequirePermission('files:create')
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({ operationId: 'uploadFile', summary: '上传文件' })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  upload(
    @CurrentSession() session: SessionContext,
    @UploadedFile() file?: DiskFile,
  ): Promise<EmptyResponseDto> {
    return this.files.uploadTenant(session, file);
  }

  @AuditEndpoint({ event: 'files.download', name: '获取租户文件下载地址' })
  @Get(':id/download')
  @RequirePermission('files:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'downloadFile',
    summary: '获取文件短时下载地址',
  })
  @ApiOkResponse({ type: FileDownloadResponseDto })
  download(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<FileDownloadResponseDto> {
    return this.files.tenantDownload(session, params.id);
  }

  @AuditEndpoint({ event: 'files.delete', name: '删除租户文件' })
  @Delete(':id')
  @RequirePermission('files:delete')
  @ApiOperation({ operationId: 'deleteFile', summary: '删除文件' })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.files.tenantDelete(session, params.id);
  }
}

@Controller('api/platform/files')
@RequireScope('platform')
@ApiTags('files')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PlatformFileQueryDto)
export class PlatformFilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPlatformFiles',
    summary: '查询所有租户及平台文件',
  })
  @ApiOkResponse({ type: FileListResponseDto })
  list(@Query() query: PlatformFileQueryDto): Promise<FileListResponseDto> {
    return this.files.platformList(query);
  }

  @AuditEndpoint({ event: 'platform-files.upload', name: '上传平台文件' })
  @Post()
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({
    operationId: 'uploadPlatformFile',
    summary: '上传平台文件',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  upload(
    @CurrentSession() session: SessionContext,
    @UploadedFile() file?: DiskFile,
  ): Promise<EmptyResponseDto> {
    return this.files.uploadPlatform(session, file);
  }

  @AuditEndpoint({
    event: 'platform-files.download',
    name: '获取平台文件下载地址',
  })
  @Get(':id/download')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'downloadPlatformFile',
    summary: '获取任意文件的短时下载地址',
  })
  @ApiOkResponse({ type: FileDownloadResponseDto })
  download(@Param() params: IdParamDto): Promise<FileDownloadResponseDto> {
    return this.files.platformDownload(params.id);
  }

  @AuditEndpoint({ event: 'site-assets.upload', name: '上传站点资源' })
  @Post('site-assets')
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({
    operationId: 'uploadSiteAsset',
    summary: '上传登录页和站点 Logo 使用的公开图片',
  })
  @ApiCreatedResponse({ type: SiteAssetResponseDto })
  uploadSiteAsset(
    @CurrentSession() session: SessionContext,
    @UploadedFile() file?: DiskFile,
  ): Promise<SiteAssetResponseDto> {
    return this.files.uploadSiteAsset(session, file);
  }

  @AuditEndpoint({ event: 'platform-files.delete', name: '删除平台文件' })
  @Delete(':id')
  @ApiOperation({
    operationId: 'deletePlatformFile',
    summary: '删除任意文件',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.files.platformDelete(params.id);
  }
}

@Controller('api/site-assets')
@ApiTags('files')
@ApiErrors()
export class SiteAssetsController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get(':id')
  @Public()
  @ApiOperation({
    operationId: 'getSiteAsset',
    summary: '公开站点图片：重定向到短时签名地址',
  })
  @ApiFoundResponse({ description: '重定向到对象存储的短时签名地址' })
  async get(
    @Param() params: IdParamDto,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.files.publicAssetUrl(params.id);
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.redirect(302, url);
  }
}

@Controller('api/tenant/notifications/images')
@RequireScope('tenant')
@RequireFeature('notifications')
@ApiTags('notifications')
@ApiCookieAuth('session')
@ApiErrors()
export class TenantNotificationImagesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @AuditEndpoint({ event: 'notification-assets.upload', name: '上传通知图片' })
  @Post()
  @RequirePermission('notifications:create')
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({
    operationId: 'uploadTenantNotificationImage',
    summary: '上传租户通知公告正文图片',
  })
  @ApiCreatedResponse({ type: NotificationAssetResponseDto })
  upload(
    @CurrentSession() session: SessionContext,
    @UploadedFile() file?: DiskFile,
  ): Promise<NotificationAssetResponseDto> {
    return this.files.uploadNotificationAsset(session, file, false);
  }
}

@Controller('api/platform/notifications/images')
@RequireScope('platform')
@ApiTags('notifications')
@ApiCookieAuth('session')
@ApiErrors()
export class PlatformNotificationImagesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @AuditEndpoint({ event: 'notification-assets.upload', name: '上传通知图片' })
  @Post()
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({
    operationId: 'uploadPlatformNotificationImage',
    summary: '上传平台通知公告正文图片',
  })
  @ApiCreatedResponse({ type: NotificationAssetResponseDto })
  upload(
    @CurrentSession() session: SessionContext,
    @UploadedFile() file?: DiskFile,
  ): Promise<NotificationAssetResponseDto> {
    return this.files.uploadNotificationAsset(session, file, true);
  }
}

@Controller('api/notification-assets')
// 图片由编辑器直接以 <img src> 加载，平台管理员和租户成员都需要读取；
// 资源的租户归属由 FilesService.notificationAssetUrl 校验。
@RequireScope('authenticated')
@ApiTags('notifications')
@ApiCookieAuth('session')
@ApiErrors()
export class NotificationAssetsController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({
    operationId: 'getNotificationAsset',
    summary: '通知正文图片：登录后重定向到短时签名地址',
  })
  @ApiFoundResponse({ description: '重定向到对象存储的短时签名地址' })
  async get(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.files.notificationAssetUrl(session, params.id);
    response.redirect(302, url);
  }
}
