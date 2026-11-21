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
