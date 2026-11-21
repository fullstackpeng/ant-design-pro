import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { decryptSecrets, encryptSecrets } from '../common/secret-box.js';
import { id, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { Prisma, StorageProvider } from '../generated/prisma/client.js';
import type {
  CreateStorageProviderDto,
  UpdateStorageProviderDto,
} from './dto/storage-provider-request.dto.js';
import { StorageProtocolRegistry } from './protocols/storage-protocol.registry.js';
import type { StorageDriver } from './protocols/storage-protocol.types.js';

function stableJson(value: unknown): string {
  const object = value as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(object)
      .sort()
      .map((key) => [key, object[key]]),
  );
}

function providerDto(provider: StorageProvider) {
  return {
    id: provider.id.toString(),
    code: provider.code,
    name: provider.name,
    protocol: provider.protocol,
    config: provider.config as Record<string, unknown>,
    secretKeys: provider.secretKeys,
    isDefault: provider.isDefault,
    isActive: provider.isActive,
    revision: provider.revision,
  };
}

@Injectable()
export class StorageProvidersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageProtocolRegistry)
    private readonly protocols: StorageProtocolRegistry,
  ) {}

  async list() {
    const rows = await this.prisma.storageProvider.findMany({
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
    return { success: true as const, data: rows.map(providerDto) };
  }

  protocolsMeta() {
    return { success: true as const, data: this.protocols.list() };
  }

  async create(body: CreateStorageProviderDto) {
    const definition = this.protocols.require(body.protocol);
    definition.validate(body.config, body.secrets);
    const secrets = encryptSecrets(body.secrets);
    const secretKeys = Object.keys(body.secrets);
    await transaction(this.prisma, async (tx) => {
      if (await tx.storageProvider.findUnique({ where: { code: body.code } }))
        throw new ConflictException({
          success: false,
          errorMessage: '服务商编码已存在',
        });
      const isFirst = (await tx.storageProvider.count()) === 0;
      await tx.storageProvider.create({
        data: {
          code: body.code,
          name: body.name,
          protocol: body.protocol,
          config: body.config as Prisma.InputJsonValue,
          secrets,
          secretKeys,
          isDefault: isFirst,
          isActive: body.isActive ?? true,
        },
      });
    });
    return success(null);
  }

  async update(provider: string, body: UpdateStorageProviderDto) {
    const providerId = id(provider);
    await transaction(this.prisma, async (tx) => {
      const current = await tx.storageProvider.findUniqueOrThrow({
        where: { id: providerId },
      });
      if (current.revision !== body.revision)
        throw new ConflictException({
          success: false,
          errorMessage: '服务商配置已被其他管理员修改，请刷新后重新编辑',
        });
      if (current.isDefault && !body.isActive)
        throw new ConflictException({
          success: false,
          errorMessage: '请先将其他服务商设为默认，再停用当前默认服务商',
        });
      const definition = this.protocols.require(current.protocol);
      const merged = { ...decryptSecrets(current.secrets) };
      let changedSecrets = false;
      for (const [key, value] of Object.entries(body.secrets ?? {})) {
        if (value === '' || value === undefined || value === null) continue;
        merged[key] = value;
        changedSecrets = true;
      }
      definition.validate(body.config, merged);
      if (
        stableJson(current.config) !== stableJson(body.config) &&
        (await tx.fileObject.count({ where: { providerId } })) > 0
      )
        throw new ConflictException({
          success: false,
          errorMessage: '该服务商已有文件，不能修改连接配置',
        });
      await tx.storageProvider.update({
        where: { id: providerId },
        data: {
          name: body.name,
          config: body.config as Prisma.InputJsonValue,
          isActive: body.isActive,
          secretKeys: Object.keys(merged),
          ...(changedSecrets ? { secrets: encryptSecrets(merged) } : {}),
          revision: { increment: 1 },
        },
      });
    });
    return success(null);
  }

  async setDefault(provider: string) {
    const providerId = id(provider);
    await transaction(this.prisma, async (tx) => {
      const target = await tx.storageProvider.findUniqueOrThrow({
        where: { id: providerId },
      });
      if (!target.isActive)
        throw new ConflictException({
          success: false,
          errorMessage: '停用的服务商不能设为默认',
        });
      await tx.storageProvider.updateMany({
        where: { isDefault: true, id: { not: providerId } },
        data: { isDefault: false },
      });
      await tx.storageProvider.update({
        where: { id: providerId },
        data: { isDefault: true },
      });
    });
    return success(null);
  }

  async test(provider: string) {
    const row = await this.prisma.storageProvider.findUniqueOrThrow({
      where: { id: id(provider) },
    });
    try {
      await this.driver(row).healthCheck();
    } catch {
      throw new BadGatewayException({
        success: false,
        errorMessage:
          '连接失败：请检查 Endpoint 是否可访问、Bucket 是否存在；自建 S3（MinIO/SeaweedFS）通常需要开启 Path Style，本地地址建议使用 127.0.0.1',
      });
    }
    return success(null);
  }

  async defaultProvider(): Promise<StorageProvider> {
    const provider = await this.prisma.storageProvider.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!provider)
      throw new ConflictException({
        success: false,
        errorMessage: '尚未配置可用的默认存储服务商，请联系平台管理员',
      });
    return provider;
  }

  async providerById(providerId: bigint): Promise<StorageProvider> {
    return this.prisma.storageProvider.findUniqueOrThrow({
      where: { id: providerId },
    });
  }

  driver(provider: StorageProvider): StorageDriver {
    const definition = this.protocols.require(provider.protocol);
    return definition.createDriver(
      provider.config as Record<string, unknown>,
      decryptSecrets(provider.secrets),
    );
  }
}
