import { randomBytes } from 'node:crypto';
import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { connect } from 'mqtt';
import { AuditAction } from '../audit/audit-action.js';
import type { SessionContext } from '../auth/session-context.js';
import { decryptSecrets, encryptSecrets } from '../common/secret-box.js';
import { id, success, tenantId } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { TenantMqttBroker } from '../generated/prisma/client.js';
import type {
  CreateTenantMqttBrokerDto,
  UpdateTenantMqttBrokerDto,
} from './dto/tenant-broker.dto.js';
import { mqttProtocolVersion, mqttUrl } from './mqtt.constants.js';

function brokerPassword(envelope: string): string {
  if (!envelope) return '';
  const value = decryptSecrets(envelope).password;
  return typeof value === 'string' ? value : '';
}

function brokerDto(
  row: TenantMqttBroker,
  tenant?: { code: string; name: string },
) {
  return {
    id: row.id.toString(),
    tenantId: row.tenantId.toString(),
    ...(tenant ? { tenantCode: tenant.code, tenantName: tenant.name } : {}),
    name: row.name,
    host: row.host,
    port: row.port,
    useTls: row.useTls,
    protocolVersion: row.protocolVersion,
    username: row.username,
    hasPassword: Boolean(row.password),
    clientIdPrefix: row.clientIdPrefix,
    subscribeFilter: row.subscribeFilter,
    keepaliveSeconds: row.keepaliveSeconds,
    cleanStart: row.cleanStart,
    sessionExpirySeconds: row.sessionExpirySeconds,
    defaultQos: row.defaultQos,
    isDefault: row.isDefault,
    isActive: row.isActive,
    revision: row.revision,
  };
}

@Injectable()
export class TenantMqttBrokersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTenant(session: SessionContext) {
    const rows = await this.prisma.tenantMqttBroker.findMany({
      where: { tenantId: tenantId(session) },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return { success: true as const, data: rows.map((row) => brokerDto(row)) };
  }

  async listPlatform() {
    const rows = await this.prisma.tenantMqttBroker.findMany({
      orderBy: [{ tenantId: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
      include: { tenant: { select: { code: true, name: true } } },
    });
    return {
      success: true as const,
      data: rows.map((row) => brokerDto(row, row.tenant)),
    };
  }

  @AuditAction({
    event: 'mqtt-brokers.create',
    name: '新增租户 Broker',
    entity: 'tenantMqttBroker',
  })
  async createTenant(session: SessionContext, body: CreateTenantMqttBrokerDto) {
    const tenant = tenantId(session);
    await this.createForTenant(tenant, body);
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-brokers.update',
    name: '修改租户 Broker',
    targetArg: 1,
    entity: 'tenantMqttBroker',
  })
  async updateTenant(
    session: SessionContext,
    broker: string,
    body: UpdateTenantMqttBrokerDto,
  ) {
    await this.updateForTenant(tenantId(session), id(broker), body);
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-brokers.delete',
    name: '删除租户 Broker',
    targetArg: 1,
    entity: 'tenantMqttBroker',
  })
  async deleteTenant(session: SessionContext, broker: string) {
    await this.deleteForTenant(tenantId(session), id(broker));
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-brokers.default',
    name: '设置租户默认 Broker',
    targetArg: 1,
    entity: 'tenantMqttBroker',
  })
  async setDefaultTenant(session: SessionContext, broker: string) {
    await this.setDefaultForTenant(tenantId(session), id(broker));
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-platform-brokers.update',
    name: '平台修改租户 Broker',
    targetArg: 0,
    entity: 'tenantMqttBroker',
  })
  async updatePlatform(broker: string, body: UpdateTenantMqttBrokerDto) {
    const row = await this.findOrThrow(id(broker));
    await this.updateForTenant(row.tenantId, row.id, body);
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-platform-brokers.delete',
    name: '平台删除租户 Broker',
    targetArg: 0,
    entity: 'tenantMqttBroker',
  })
  async deletePlatform(broker: string) {
    const row = await this.findOrThrow(id(broker));
    await this.deleteForTenant(row.tenantId, row.id);
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-platform-brokers.default',
    name: '平台设置默认 Broker',
    targetArg: 0,
    entity: 'tenantMqttBroker',
  })
  async setDefaultPlatform(broker: string) {
    const row = await this.findOrThrow(id(broker));
    await this.setDefaultForTenant(row.tenantId, row.id);
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-brokers.test',
    name: '测试 Broker 连接',
    targetArg: 0,
    mode: 'external',
    entity: 'tenantMqttBroker',
  })
  async test(broker: string) {
    return this.testRow(await this.findOrThrow(id(broker)));
  }

  @AuditAction({
    event: 'mqtt-brokers.tenant-test',
    name: '测试租户 Broker 连接',
    targetArg: 1,
    mode: 'external',
    entity: 'tenantMqttBroker',
  })
  async testForTenant(session: SessionContext, broker: string) {
    const row = await this.findForTenant(tenantId(session), id(broker));
    return this.testRow(row);
  }

  private async testRow(row: TenantMqttBroker) {
    const client = connect(mqttUrl(row.host, row.port, row.useTls), {
      protocolVersion: mqttProtocolVersion(row.protocolVersion),
      clientId:
        row.clientIdPrefix || `vibeflow-test-${randomBytes(6).toString('hex')}`,
      username: row.username || undefined,
      password: row.password ? brokerPassword(row.password) : undefined,
      connectTimeout: 5000,
      reconnectPeriod: 0,
      clean: true,
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('连接超时')), 6000);
        client.once('connect', () => {
          clearTimeout(timer);
          resolve();
        });
        client.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    } catch {
      throw new BadGatewayException({
        success: false,
        errorMessage: '连接失败，请检查 Broker 地址、协议版本和凭据',
      });
    } finally {
      await client.endAsync(true).catch(() => undefined);
    }
    return success(null);
  }

  async listActive(): Promise<
    (TenantMqttBroker & { tenant: { code: string } })[]
  > {
    return this.prisma.tenantMqttBroker.findMany({
      where: { isActive: true },
      include: { tenant: { select: { code: true } } },
    });
  }

  async findForTenant(tenant: bigint, brokerId: bigint) {
    const row = await this.findOrThrow(brokerId);
    if (row.tenantId !== tenant)
      throw new ForbiddenException({
        success: false,
        errorMessage: '不能访问其他租户的 Broker',
      });
    return row;
  }

  async findOrThrow(brokerId: bigint) {
    const row = await this.prisma.tenantMqttBroker.findUnique({
      where: { id: brokerId },
    });
    if (!row)
      throw new NotFoundException({
        success: false,
        errorMessage: 'MQTT Broker 配置不存在',
      });
    return row;
  }

  credentials(row: TenantMqttBroker) {
    return {
      username: row.username || undefined,
      password: row.password ? brokerPassword(row.password) : undefined,
    };
  }

  private async createForTenant(
    tenant: bigint,
    body: CreateTenantMqttBrokerDto,
  ) {
    await transaction(this.prisma, async (tx) => {
      if (
        await tx.tenantMqttBroker.findUnique({
          where: { tenantId_name: { tenantId: tenant, name: body.name } },
        })
      )
        throw new ConflictException({
          success: false,
          errorMessage: 'Broker 名称已存在',
        });
      const count = await tx.tenantMqttBroker.count({
        where: { tenantId: tenant },
      });
      await tx.tenantMqttBroker.create({
        data: {
          tenantId: tenant,
          name: body.name,
          host: body.host,
          port: body.port,
          useTls: body.useTls,
          protocolVersion: body.protocolVersion,
          username: body.username ?? '',
          password: body.password
            ? encryptSecrets({ password: body.password })
            : '',
          clientIdPrefix: body.clientIdPrefix ?? '',
          subscribeFilter: body.subscribeFilter ?? '#',
          keepaliveSeconds: body.keepaliveSeconds ?? 60,
          cleanStart: body.cleanStart ?? false,
          sessionExpirySeconds: body.sessionExpirySeconds ?? 86400,
          defaultQos: body.defaultQos ?? 1,
          isDefault: count === 0,
          isActive: body.isActive ?? true,
        },
      });
    });
  }

  private async updateForTenant(
    tenant: bigint,
    brokerId: bigint,
    body: UpdateTenantMqttBrokerDto,
  ) {
    await transaction(this.prisma, async (tx) => {
      const current = await this.findOrThrow(brokerId);
      if (current.tenantId !== tenant)
        throw new ForbiddenException({
          success: false,
          errorMessage: '不能访问其他租户的 Broker',
        });
      if (current.revision !== body.revision)
        throw new ConflictException({
          success: false,
          errorMessage: '配置已被修改，请刷新后重试',
        });
      await tx.tenantMqttBroker.update({
        where: { id: brokerId },
        data: {
          name: body.name,
          host: body.host,
          port: body.port,
          useTls: body.useTls,
          protocolVersion: body.protocolVersion,
          username: body.username ?? current.username,
          ...(body.password
            ? { password: encryptSecrets({ password: body.password }) }
            : {}),
          clientIdPrefix: body.clientIdPrefix ?? current.clientIdPrefix,
          subscribeFilter: body.subscribeFilter ?? current.subscribeFilter,
          keepaliveSeconds: body.keepaliveSeconds ?? current.keepaliveSeconds,
          cleanStart: body.cleanStart ?? current.cleanStart,
          sessionExpirySeconds:
            body.sessionExpirySeconds ?? current.sessionExpirySeconds,
          defaultQos: body.defaultQos ?? current.defaultQos,
          isActive: body.isActive ?? current.isActive,
          revision: { increment: 1 },
        },
      });
    });
  }

  private async deleteForTenant(tenant: bigint, brokerId: bigint) {
    await transaction(this.prisma, async (tx) => {
      const row = await this.findOrThrow(brokerId);
      if (row.tenantId !== tenant)
        throw new ForbiddenException({
          success: false,
          errorMessage: '不能访问其他租户的 Broker',
        });
      if (row.isDefault) {
        const others = await tx.tenantMqttBroker.count({
          where: { tenantId: tenant, id: { not: brokerId } },
        });
        if (others > 0)
          throw new ConflictException({
            success: false,
            errorMessage: '请先将其他 Broker 设为默认',
          });
      }
      await tx.tenantMqttBroker.delete({ where: { id: brokerId } });
    });
  }

  private async setDefaultForTenant(tenant: bigint, brokerId: bigint) {
    await transaction(this.prisma, async (tx) => {
      const row = await this.findOrThrow(brokerId);
      if (row.tenantId !== tenant)
        throw new ForbiddenException({
          success: false,
          errorMessage: '不能访问其他租户的 Broker',
        });
      if (!row.isActive)
        throw new ConflictException({
          success: false,
          errorMessage: '停用的 Broker 不能设为默认',
        });
      await tx.tenantMqttBroker.updateMany({
        where: { tenantId: tenant, isDefault: true, id: { not: brokerId } },
        data: { isDefault: false },
      });
      await tx.tenantMqttBroker.update({
        where: { id: brokerId },
        data: { isDefault: true },
      });
    });
  }
}
