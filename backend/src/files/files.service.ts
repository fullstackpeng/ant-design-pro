import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import { recordAuditTarget } from '../audit/audit-context.js';
import type { SessionContext } from '../auth/session-context.js';
import { id, pagination, success, tenantId } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma } from '../generated/prisma/client.js';
import { StorageProvidersService } from '../storage/storage-providers.service.js';
import type {
  FileQueryDto,
  PlatformFileQueryDto,
} from './dto/file-request.dto.js';
import { buildObjectKey } from './file-object-key.js';
import {
  ALLOWED_MIME_TYPES,
  DOWNLOAD_URL_TTL_SECONDS,
  MAX_SITE_ASSET_BYTES,
  MAX_UPLOAD_BYTES,
} from './files.constants.js';

export interface UploadedFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

const MEGABYTE = 1024n * 1024n;

const fileSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  size: true,
  uploadedByName: true,
  createdAt: true,
  provider: { select: { name: true } },
  tenant: { select: { code: true, name: true } },
} as const;

type FileRow = Prisma.FileObjectGetPayload<{ select: typeof fileSelect }>;

function fileDto(row: FileRow) {
  return {
    id: row.id.toString(),
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size.toString(),
    providerName: row.provider.name,
    tenantCode: row.tenant?.code ?? null,
    tenantName: row.tenant?.name ?? null,
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageProvidersService)
    private readonly providers: StorageProvidersService,
  ) {}

  async tenantList(session: SessionContext, query: FileQueryDto) {
    const where = {
      tenantId: tenantId(session),
      ...(query.keyword
        ? {
            originalName: {
              contains: query.keyword,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fileObject.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'desc' },
        select: fileSelect,
      }),
      this.prisma.fileObject.count({ where }),
    ]);
    return { success: true as const, data: rows.map(fileDto), total };
  }

  async platformList(query: PlatformFileQueryDto) {
    const where: Prisma.FileObjectWhereInput = {
      ...(query.keyword
        ? {
            originalName: {
              contains: query.keyword,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.tenant
        ? {
            OR: [
              {
                tenant: {
                  code: { contains: query.tenant, mode: 'insensitive' },
                },
              },
              {
                tenant: {
                  name: { contains: query.tenant, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fileObject.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'desc' },
        select: fileSelect,
      }),
      this.prisma.fileObject.count({ where }),
    ]);
    return { success: true as const, data: rows.map(fileDto), total };
  }

  async tenantUsage(session: SessionContext) {
    const tenant = tenantId(session);
    const [subscription, aggregate] = await this.prisma.$transaction([
      this.prisma.subscription.findUnique({
        where: { tenantId: tenant },
        include: { plan: true },
      }),
      this.prisma.fileObject.aggregate({
        _sum: { size: true },
        where: { tenantId: tenant },
      }),
    ]);
    const used = aggregate._sum.size ?? 0n;
    const quota = subscription
      ? BigInt(subscription.plan.maxStorageMb) * MEGABYTE
      : 0n;
    return success({
      usedBytes: used.toString(),
      quotaBytes: quota.toString(),
      maxFileSizeBytes: subscription
        ? (BigInt(subscription.plan.maxFileSizeMb) * MEGABYTE).toString()
        : '0',
      planName: subscription?.plan.name ?? null,
    });
  }

  @AuditAction({
    event: 'files.upload',
    name: '上传租户文件',
    mode: 'external',
    entity: 'fileObject',
  })
  async uploadTenant(session: SessionContext, file?: UploadedFile) {
    await this.save(session, file, tenantId(session), 'private');
    return success(null);
  }

  @AuditAction({
    event: 'platform-files.upload',
    name: '上传平台文件',
    mode: 'external',
    entity: 'fileObject',
  })
  async uploadPlatform(session: SessionContext, file?: UploadedFile) {
    await this.save(session, file, null, 'private');
    return success(null);
  }

  @AuditAction({
    event: 'site-assets.upload',
    name: '上传站点资源',
    mode: 'external',
    entity: 'fileObject',
  })
  async uploadSiteAsset(session: SessionContext, file?: UploadedFile) {
    this.assertBitmap(file, '站点图片');
    const created = await this.save(session, file, null, 'public');
    return success({
      id: created.id.toString(),
      url: `/api/site-assets/${created.id}`,
    });
  }

  /** 编辑器图片：平台资产 tenantId=null，租户资产归属当前租户。 */
  @AuditAction({
    event: 'notification-assets.upload',
    name: '上传通知图片',
    mode: 'external',
    entity: 'fileObject',
  })
  async uploadNotificationAsset(
    session: SessionContext,
    file: UploadedFile | undefined,
    platform: boolean,
  ) {
    this.assertBitmap(file, '正文图片');
    const created = await this.save(
      session,
      file,
      platform ? null : tenantId(session),
      'notification',
    );
    return success({
      id: created.id.toString(),
      url: `/api/notification-assets/${created.id}`,
    });
  }

  async notificationAssetUrl(session: SessionContext, file: string) {
    const row = await this.prisma.fileObject.findFirst({
      where: {
        id: id(file),
        visibility: 'notification',
        OR: [
          { tenantId: null },
          { tenantId: session.tenant ? tenantId(session) : null },
        ],
      },
      select: { objectKey: true, providerId: true },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '图片不存在',
      });
    const provider = await this.providers.providerById(row.providerId);
    return this.providers
      .driver(provider)
      .signDownload(row.objectKey, DOWNLOAD_URL_TTL_SECONDS);
  }

  private assertBitmap(
    file: UploadedFile | undefined,
    label: string,
  ): asserts file is UploadedFile {
    if (
      !file?.mimetype.startsWith('image/') ||
      file.mimetype === 'image/svg+xml'
    )
      throw new BadRequestException({
        success: false,
        errorMessage: `${label}仅支持 PNG、JPEG、GIF、WebP 等位图格式`,
      });
    if (file.size > MAX_SITE_ASSET_BYTES)
      throw new BadRequestException({
        success: false,
        errorMessage: `${label}不能超过 10 MB`,
      });
  }

  async publicAssetUrl(file: string) {
    const row = await this.prisma.fileObject.findFirst({
      where: { id: id(file), tenantId: null, visibility: 'public' },
      select: { objectKey: true, providerId: true },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '图片不存在',
      });
    const provider = await this.providers.providerById(row.providerId);
    return this.providers
      .driver(provider)
      .signDownload(row.objectKey, DOWNLOAD_URL_TTL_SECONDS);
  }

  @AuditAction({
    event: 'files.download',
    name: '获取租户文件下载地址',
    targetArg: 1,
    mode: 'external',
    entity: 'fileObject',
  })
  async tenantDownload(session: SessionContext, file: string) {
    const row = await this.prisma.fileObject.findFirst({
      where: { id: id(file), tenantId: tenantId(session) },
      select: {
        id: true,
        tenantId: true,
        originalName: true,
        objectKey: true,
        providerId: true,
      },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '文件不存在',
      });
    recordAuditTarget('fileObject', row);
    return this.download(row.providerId, row.objectKey);
  }

  @AuditAction({
    event: 'platform-files.download',
    name: '获取平台文件下载地址',
    targetArg: 0,
    mode: 'external',
    entity: 'fileObject',
  })
  async platformDownload(file: string) {
    const row = await this.prisma.fileObject.findUniqueOrThrow({
      where: { id: id(file) },
      select: {
        id: true,
        tenantId: true,
        originalName: true,
        objectKey: true,
        providerId: true,
      },
    });
    recordAuditTarget('fileObject', row);
    return this.download(row.providerId, row.objectKey);
  }

  @AuditAction({
    event: 'files.delete',
    name: '删除租户文件',
    targetArg: 1,
    mode: 'external',
    entity: 'fileObject',
  })
  async tenantDelete(session: SessionContext, file: string) {
    const row = await this.prisma.fileObject.findFirst({
      where: { id: id(file), tenantId: tenantId(session) },
      select: { id: true, objectKey: true, providerId: true },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: '文件不存在',
      });
    await this.remove(row.providerId, row.objectKey, row.id);
    return success(null);
  }

  @AuditAction({
    event: 'platform-files.delete',
    name: '删除平台文件',
    targetArg: 0,
    mode: 'external',
    entity: 'fileObject',
  })
  async platformDelete(file: string) {
    const row = await this.prisma.fileObject.findUniqueOrThrow({
      where: { id: id(file) },
      select: { id: true, objectKey: true, providerId: true },
    });
    await this.remove(row.providerId, row.objectKey, row.id);
    return success(null);
  }

  private async download(providerId: bigint, objectKey: string) {
    const provider = await this.providers.providerById(providerId);
    const url = await this.providers
      .driver(provider)
      .signDownload(objectKey, DOWNLOAD_URL_TTL_SECONDS);
    return success({ url, expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS });
  }

  private async remove(providerId: bigint, objectKey: string, fileId: bigint) {
    const provider = await this.providers.providerById(providerId);
    try {
      await this.providers.driver(provider).delete(objectKey);
    } catch {
      throw new BadGatewayException({
        success: false,
        errorMessage: '删除存储对象失败，请稍后重试',
      });
    }
    await this.prisma.fileObject.delete({ where: { id: fileId } });
  }

  private async save(
    session: SessionContext,
    file: UploadedFile | undefined,
    tenant: bigint | null,
    visibility: 'private' | 'public' | 'notification',
  ) {
    if (!file)
      throw new BadRequestException({
        success: false,
        errorMessage: '请选择要上传的文件',
      });
    try {
      this.assertFileAllowed(file);
      const provider = await this.providers.defaultProvider();
      if (tenant)
        await this.prisma.$transaction((tx) =>
          this.assertQuota(tx, tenant, file.size),
        );
      const objectKey = buildObjectKey(tenant, file.originalname);
      const driver = this.providers.driver(provider);
      try {
        const result = await driver.upload({
          key: objectKey,
          body: createReadStream(file.path),
          contentType: file.mimetype,
          size: file.size,
        });
        return await transaction(this.prisma, async (tx) => {
          if (tenant) await this.assertQuota(tx, tenant, file.size);
          return tx.fileObject.create({
            data: {
              tenantId: tenant,
              providerId: provider.id,
              protocol: provider.protocol,
              objectKey,
              originalName: file.originalname.slice(0, 255),
              mimeType: file.mimetype,
              size: BigInt(file.size),
              checksum: result.etag ?? null,
              visibility,
              uploadedBy: id(session.userid),
              uploadedByName: session.name.slice(0, 100),
            },
            select: { id: true },
          });
        });
      } catch (error) {
        await driver.delete(objectKey).catch(() => undefined);
        throw error;
      }
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  private assertFileAllowed(file: UploadedFile) {
    if (!file.size || file.size > MAX_UPLOAD_BYTES)
      throw new BadRequestException({
        success: false,
        errorMessage: '文件为空或超过允许的大小上限',
      });
    if (!ALLOWED_MIME_TYPES.has(file.mimetype))
      throw new BadRequestException({
        success: false,
        errorMessage: '不支持的文件类型',
      });
  }

  private async assertQuota(
    tx: Prisma.TransactionClient,
    tenant: bigint,
    size: number,
  ) {
    const subscription = await tx.subscription.findUnique({
      where: { tenantId: tenant },
      include: { plan: true },
    });
    const now = new Date();
    if (
      !subscription?.isActive ||
      subscription.startsAt > now ||
      subscription.expiresAt <= now
    )
      throw new ForbiddenException({
        success: false,
        errorMessage: '套餐未生效、已停用或已到期，请联系平台管理员',
      });
    const plan = subscription.plan;
    if (BigInt(size) > BigInt(plan.maxFileSizeMb) * MEGABYTE)
      throw new ConflictException({
        success: false,
        errorMessage: `单个文件不能超过 ${plan.maxFileSizeMb} MB`,
      });
    const aggregate = await tx.fileObject.aggregate({
      _sum: { size: true },
      where: { tenantId: tenant },
    });
    const used = aggregate._sum.size ?? 0n;
    if (used + BigInt(size) > BigInt(plan.maxStorageMb) * MEGABYTE)
      throw new ConflictException({
        success: false,
        errorMessage: '存储空间不足，请联系平台管理员调整套餐',
      });
  }
}
