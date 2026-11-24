import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import { decryptSecrets, encryptSecrets } from '../common/secret-box.js';
import { success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import { transaction } from '../database/transaction.js';
import type { MqttPlatformBroker } from '../generated/prisma/client.js';
import type { UpdateMqttPlatformBrokerDto } from './dto/platform-broker.dto.js';
import { MosquittoAdminClient } from './mosquitto-admin.client.js';
import {
  DYNAMIC_SECURITY_RESPONSE_TOPIC,
  MQTT_PROTOCOLS,
} from './mqtt.constants.js';

const BRIDGE_ROLE = 'platform_bridge_role';
const BRIDGE_ACLS = [
  { acltype: 'publishClientSend', topic: 'tenants/#' },
  { acltype: 'publishClientReceive', topic: 'tenants/#' },
  { acltype: 'subscribePattern', topic: 'tenants/#' },
  { acltype: 'unsubscribePattern', topic: 'tenants/#' },
];

function passwordOf(envelope: string): string {
  const value = decryptSecrets(envelope).password;
  return typeof value === 'string' ? value : '';
}

function brokerDto(row: MqttPlatformBroker) {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    useTls: row.useTls,
    defaultProtocol: row.defaultProtocol,
    adminUsername: row.adminUsername,
    hasAdminPassword: Boolean(row.adminPassword),
    bridgeUsername: row.bridgeUsername,
    hasBridgePassword: Boolean(row.bridgePassword),
    responseTopic: row.responseTopic,
    commandTimeoutMs: row.commandTimeoutMs,
    isEnabled: row.isEnabled,
    revision: row.revision,
  };
}

@Injectable()
export class PlatformMqttBrokerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.mqttPlatformBroker.findUnique({
      where: { id: 1 },
    });
    return success(row ? brokerDto(row) : null);
  }

  @AuditAction({
    event: 'mqtt-platform.update',
    name: '修改平台 MQTT 配置',
    entity: 'mqttPlatformBroker',
  })
  async update(body: UpdateMqttPlatformBrokerDto) {
    if (!(MQTT_PROTOCOLS as readonly string[]).includes(body.defaultProtocol))
      throw new ConflictException({
        success: false,
        errorMessage: 'MQTT 协议版本必须是 3.1.1 或 5',
      });
    await transaction(this.prisma, async (tx) => {
      const current = await tx.mqttPlatformBroker.findUnique({
        where: { id: 1 },
      });
      if (current && current.revision !== body.revision)
        throw new ConflictException({
          success: false,
          errorMessage: '平台 Broker 配置已被其他管理员修改，请刷新后重试',
        });
      if (!current && (!body.adminPassword || !body.bridgePassword))
        throw new ConflictException({
          success: false,
          errorMessage: '首次配置必须填写管理密码和 Bridge 密码',
        });
      const adminPassword = body.adminPassword
        ? encryptSecrets({ password: body.adminPassword })
        : current?.adminPassword;
      const bridgePassword = body.bridgePassword
        ? encryptSecrets({ password: body.bridgePassword })
        : current?.bridgePassword;
      if (!adminPassword || !bridgePassword)
        throw new ConflictException({
          success: false,
          errorMessage: '管理密码和 Bridge 密码不能为空',
        });
      const data = {
        name: body.name,
        host: body.host,
        port: body.port,
        useTls: body.useTls,
        defaultProtocol: body.defaultProtocol,
        adminUsername: body.adminUsername,
        adminPassword,
        bridgeUsername: body.bridgeUsername,
        bridgePassword,
        responseTopic: body.responseTopic,
        commandTimeoutMs: body.commandTimeoutMs,
        isEnabled: body.isEnabled,
      };
      if (current) {
        await tx.mqttPlatformBroker.update({
          where: { id: 1 },
          data: { ...data, revision: { increment: 1 } },
        });
      } else {
        await tx.mqttPlatformBroker.create({ data: { id: 1, ...data } });
      }
    });
    return success(null);
  }

  async raw(): Promise<MqttPlatformBroker | null> {
    return this.prisma.mqttPlatformBroker.findUnique({ where: { id: 1 } });
  }

  async required(): Promise<MqttPlatformBroker> {
    const row = await this.raw();
    if (!row?.isEnabled)
      throw new ConflictException({
        success: false,
        errorMessage: '平台 MQTT Broker 尚未配置或未启用',
      });
    return row;
  }

  adminClient(row: MqttPlatformBroker): MosquittoAdminClient {
    return new MosquittoAdminClient({
      host: row.host,
      port: row.port,
      useTls: row.useTls,
      username: row.adminUsername,
      password: passwordOf(row.adminPassword),
      responseTopic: row.responseTopic || DYNAMIC_SECURITY_RESPONSE_TOPIC,
      timeoutMs: row.commandTimeoutMs,
    });
  }

  bridgeCredentials(row: MqttPlatformBroker) {
    return {
      username: row.bridgeUsername,
      password: passwordOf(row.bridgePassword),
    };
  }

  @AuditAction({
    event: 'mqtt-platform.test',
    name: '测试平台 MQTT 连接',
    mode: 'external',
    entity: 'mqttPlatformBroker',
  })
  async test() {
    const row = await this.required();
    const admin = this.adminClient(row);
    try {
      await admin.command({ command: 'listClients', count: 1, offset: 0 });
    } catch {
      throw new BadGatewayException({
        success: false,
        errorMessage: '无法连接平台 MQTT Broker 或管理账号无效',
      });
    } finally {
      await admin.close();
    }
    return success(null);
  }

  @AuditAction({
    event: 'mqtt-platform.provision',
    name: '配置 MQTT Bridge',
    mode: 'external',
    entity: 'mqttPlatformBroker',
  })
  async provisionBridge() {
    const row = await this.required();
    const bridge = this.bridgeCredentials(row);
    const admin = this.adminClient(row);
    try {
      await this.ensureRole(admin);
      await this.ensureClient(admin, row.bridgeUsername, bridge.password);
    } catch (error) {
      throw new BadGatewayException({
        success: false,
        errorMessage:
          error instanceof Error
            ? `Bridge 账号初始化失败：${error.message}`
            : 'Bridge 账号初始化失败',
      });
    } finally {
      await admin.close();
    }
    return success(null);
  }

  private async ensureRole(admin: MosquittoAdminClient) {
    try {
      await admin.command({ command: 'getRole', rolename: BRIDGE_ROLE });
    } catch {
      await admin
        .command({
          command: 'createRole',
          rolename: BRIDGE_ROLE,
          acls: BRIDGE_ACLS.map((acl) => ({
            ...acl,
            allow: true,
            priority: 0,
          })),
        })
        .catch((error: Error) => {
          if (!/exists|already/i.test(error.message)) throw error;
        });
    }
    for (const acl of BRIDGE_ACLS) {
      await admin
        .command({
          command: 'addRoleACL',
          rolename: BRIDGE_ROLE,
          ...acl,
          allow: true,
          priority: 0,
        })
        .catch(() => undefined);
    }
  }

  private async ensureClient(
    admin: MosquittoAdminClient,
    username: string,
    password: string,
  ) {
    try {
      await admin.command({ command: 'getClient', username });
    } catch {
      await admin
        .command({
          command: 'createClient',
          username,
          password,
          roles: [{ rolename: BRIDGE_ROLE, priority: 0 }],
        })
        .catch((error: Error) => {
          if (!/exists|already/i.test(error.message)) throw error;
        });
    }
    await admin.command({ command: 'setClientPassword', username, password });
    await admin
      .command({
        command: 'addClientRole',
        username,
        rolename: BRIDGE_ROLE,
        priority: 0,
      })
      .catch(() => undefined);
  }
}
