import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { verifyPassword } from '../auth/password.js';
import type { SessionContext } from '../auth/session-context.js';
import { decryptSecrets, encryptSecrets } from '../common/secret-box.js';
import { id, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import type { MosquittoAdminClient } from './mosquitto-admin.client.js';
import {
  MQTT_PROTOCOLS,
  randomPassword,
  tenantTopicPrefix,
} from './mqtt.constants.js';
import { PlatformMqttBrokerService } from './platform-broker.service.js';

const REVEAL_WINDOW_MS = 15 * 60 * 1000;
const REVEAL_MAX_FAILURES = 5;
const POLL_MS = Number(process.env.MQTT_PROVISION_POLL_MS ?? 10000);

interface CredentialRow {
  id: bigint;
  tenantId: bigint;
  username: string;
  password: string;
  roleName: string;
  status: string;
  attempts: number;
}

function credentialAcls(tenantCode: string) {
  const topic = tenantTopicPrefix(tenantCode);
  return [
    { acltype: 'publishClientSend', topic },
    { acltype: 'publishClientReceive', topic },
    { acltype: 'subscribePattern', topic },
    { acltype: 'unsubscribePattern', topic },
  ];
}

@Injectable()
export class MqttCredentialsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly platformBroker: PlatformMqttBrokerService;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlatformMqttBrokerService)
    platformBroker: PlatformMqttBrokerService,
  ) {
    this.platformBroker = platformBroker;
  }

  onModuleInit() {
    if (!Number.isFinite(POLL_MS) || POLL_MS <= 0) return;
    this.timer = setInterval(
      () => void this.processDue().catch(() => undefined),
      POLL_MS,
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async ensureForTenant(tenantId: bigint, tenantCode: string) {
    const username = `tenant_${tenantCode.replace(/[^a-z0-9]/gi, '_')}`;
    const roleName = `${username}_role`;
    const password = randomPassword();
    await this.prisma.tenantMqttCredential.upsert({
      where: {
        tenantId_platformBrokerId: { tenantId, platformBrokerId: 1 },
      },
      update: {},
      create: {
        tenantId,
        platformBrokerId: 1,
        username,
        password: encryptSecrets({ password }),
        roleName,
        status: 'pending',
      },
    });
  }

  async processDue() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.tenantMqttCredential.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
          nextAttemptAt: { lte: new Date() },
        },
        orderBy: { id: 'asc' },
        take: 5,
        include: { tenant: { select: { code: true } } },
      });
      for (const row of rows) {
        const claimed = await this.prisma.tenantMqttCredential.updateMany({
          where: { id: row.id, status: { in: ['pending', 'failed'] } },
          data: { status: 'provisioning' },
        });
        if (claimed.count === 0) continue;
        await this.provision(row, row.tenant.code);
      }
    } finally {
      this.running = false;
    }
  }

  async provisionTenant(tenantId: bigint) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { id: true, code: true },
    });
    await this.ensureForTenant(tenant.id, tenant.code);
    const row = await this.prisma.tenantMqttCredential.findUniqueOrThrow({
      where: {
        tenantId_platformBrokerId: { tenantId: tenant.id, platformBrokerId: 1 },
      },
    });
    await this.prisma.tenantMqttCredential.update({
      where: { id: row.id },
      data: { status: 'provisioning' },
    });
    await this.provision(row, tenant.code);
    return success(null);
  }

  async listTenants() {
    const rows = await this.prisma.tenant.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        mqttCredentials: {
          take: 1,
          select: {
            status: true,
            username: true,
            lastError: true,
            provisionedAt: true,
          },
        },
      },
    });
    return {
      success: true as const,
      data: rows.map((row) => {
        const credential = row.mqttCredentials[0];
        return {
          tenantId: row.id.toString(),
          tenantCode: row.code,
          tenantName: row.name,
          status: credential?.status ?? 'missing',
          username: credential?.username ?? '',
          lastError: credential?.lastError ?? '',
          provisionedAt: credential?.provisionedAt
            ? credential.provisionedAt.toISOString()
            : null,
        };
      }),
    };
  }

  async metadata(session: SessionContext, tenantIdParam?: string) {
    const tenantId = this.resolveTenant(session, tenantIdParam);
    const [credential, broker] = await Promise.all([
      this.prisma.tenantMqttCredential.findUnique({
        where: {
          tenantId_platformBrokerId: { tenantId, platformBrokerId: 1 },
        },
      }),
      this.platformBroker.raw(),
    ]);
    if (!credential) {
      return success(
        broker
          ? {
              tenantId: tenantId.toString(),
              username: '',
              roleName: '',
              status: 'missing',
              lastError: '',
              provisionedAt: null,
              platform: this.platformInfo(broker),
              topicPrefix: '',
            }
          : null,
      );
    }
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { code: true },
    });
    return success({
      tenantId: tenantId.toString(),
      username: credential.username,
      roleName: credential.roleName,
      status: credential.status,
      lastError: credential.lastError,
      provisionedAt: credential.provisionedAt
        ? credential.provisionedAt.toISOString()
        : null,
      platform: broker
        ? this.platformInfo(broker)
        : {
            host: '',
            port: 0,
            useTls: false,
            protocols: [...MQTT_PROTOCOLS],
          },
      topicPrefix: tenantTopicPrefix(tenant.code),
    });
  }

  async reveal(
    session: SessionContext,
    tenantIdParam: string | undefined,
    password: string,
    ip: string,
  ) {
    const tenantId = this.resolveTenant(session, tenantIdParam);
    await this.verifyLoginPassword(session, password, tenantId, ip);
    const credential = await this.prisma.tenantMqttCredential.findUnique({
      where: {
        tenantId_platformBrokerId: { tenantId, platformBrokerId: 1 },
      },
    });
    if (!credential)
      throw new NotFoundException({
        success: false,
        errorMessage: '该租户尚未生成平台 Broker 凭据',
      });
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { code: true },
    });
    const broker = await this.platformBroker.required();
    const secret = decryptSecrets(credential.password);
    return success({
      username: credential.username,
      password: typeof secret.password === 'string' ? secret.password : '',
      host: broker.host,
      port: broker.port,
      useTls: broker.useTls,
      protocols: [...MQTT_PROTOCOLS],
      topicPrefix: tenantTopicPrefix(tenant.code),
    });
  }

  async rotate(
    session: SessionContext,
    tenantIdParam: string | undefined,
    password: string,
    ip: string,
  ) {
    const tenantId = this.resolveTenant(session, tenantIdParam);
    await this.verifyLoginPassword(session, password, tenantId, ip);
    const credential = await this.prisma.tenantMqttCredential.findUnique({
      where: {
        tenantId_platformBrokerId: { tenantId, platformBrokerId: 1 },
      },
    });
    if (!credential)
      throw new NotFoundException({
        success: false,
        errorMessage: '该租户尚未生成平台 Broker 凭据',
      });
    const broker = await this.platformBroker.required();
    const newPassword = randomPassword();
    const admin = this.platformBroker.adminClient(broker);
    try {
      await admin.command({
        command: 'setClientPassword',
        username: credential.username,
        password: newPassword,
      });
    } catch (error) {
      throw new ConflictException({
        success: false,
        errorMessage:
          error instanceof Error
            ? `密码轮换失败：${error.message}`
            : '密码轮换失败',
      });
    } finally {
      await admin.close();
    }
    await this.prisma.tenantMqttCredential.update({
      where: { id: credential.id },
      data: {
        password: encryptSecrets({ password: newPassword }),
        revision: { increment: 1 },
      },
    });
    await this.audit(session, tenantId, credential.id, 'rotate', true, ip);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { code: true },
    });
    return success({
      username: credential.username,
      password: newPassword,
      host: broker.host,
      port: broker.port,
      useTls: broker.useTls,
      protocols: [...MQTT_PROTOCOLS],
      topicPrefix: tenantTopicPrefix(tenant.code),
    });
  }

  private async provision(row: CredentialRow, tenantCode: string) {
    let admin: MosquittoAdminClient | undefined;
    try {
      const broker = await this.platformBroker.required();
      admin = this.platformBroker.adminClient(broker);
      const secret = decryptSecrets(row.password);
      const password =
        typeof secret.password === 'string' ? secret.password : '';
      await this.ensureRole(admin, row.roleName, tenantCode);
      await this.ensureClient(admin, row.username, password, row.roleName);
      await this.prisma.tenantMqttCredential.update({
        where: { id: row.id },
        data: {
          status: 'provisioned',
          lastError: '',
          provisionedAt: new Date(),
          attempts: 0,
        },
      });
    } catch (error) {
      const attempts = row.attempts + 1;
      const delaySeconds = Math.min(60 * 10, 2 ** Math.min(attempts, 6));
      await this.prisma.tenantMqttCredential.update({
        where: { id: row.id },
        data: {
          status: 'failed',
          attempts,
          lastError:
            error instanceof Error ? error.message.slice(0, 2000) : '开通失败',
          nextAttemptAt: new Date(Date.now() + delaySeconds * 1000),
        },
      });
    } finally {
      await admin?.close();
    }
  }

  private async ensureRole(
    admin: MosquittoAdminClient,
    roleName: string,
    tenantCode: string,
  ) {
    try {
      await admin.command({ command: 'getRole', rolename: roleName });
    } catch {
      await admin
        .command({
          command: 'createRole',
          rolename: roleName,
          acls: credentialAcls(tenantCode).map((acl) => ({
            ...acl,
            allow: true,
            priority: 0,
          })),
        })
        .catch((error: Error) => {
          if (!/exists|already/i.test(error.message)) throw error;
        });
    }
    for (const acl of credentialAcls(tenantCode)) {
      await admin
        .command({
          command: 'addRoleACL',
          rolename: roleName,
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
    roleName: string,
  ) {
    try {
      await admin.command({ command: 'getClient', username });
    } catch {
      await admin
        .command({
          command: 'createClient',
          username,
          password,
          roles: [{ rolename: roleName, priority: 0 }],
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
        rolename: roleName,
        priority: 0,
      })
      .catch(() => undefined);
  }

  private resolveTenant(session: SessionContext, tenantIdParam?: string) {
    if (session.isPlatformAdmin && tenantIdParam) return id(tenantIdParam);
    if (!session.tenant)
      throw new ForbiddenException({
        success: false,
        errorMessage: '需要租户身份',
      });
    const tenantId = BigInt(session.tenant.id);
    if (tenantIdParam && BigInt(tenantIdParam) !== tenantId)
      throw new ForbiddenException({
        success: false,
        errorMessage: '不能访问其他租户',
      });
    return tenantId;
  }

  private async verifyLoginPassword(
    session: SessionContext,
    password: string,
    tenantId: bigint,
    ip: string,
  ) {
    const failures = await this.prisma.mqttSecretAudit.count({
      where: {
        actorId: id(session.userid),
        action: 'reveal',
        success: false,
        createdAt: { gt: new Date(Date.now() - REVEAL_WINDOW_MS) },
      },
    });
    if (failures >= REVEAL_MAX_FAILURES)
      throw new HttpException(
        {
          success: false,
          errorMessage: '密码校验失败次数过多，请稍后再试',
        },
        429,
      );
    const user = await this.prisma.user.findUnique({
      where: { id: id(session.userid) },
      select: { passwordHash: true },
    });
    const valid =
      user !== null && (await verifyPassword(password, user.passwordHash));
    await this.audit(session, tenantId, undefined, 'reveal', valid, ip);
    if (!valid)
      throw new ForbiddenException({
        success: false,
        errorMessage: '登录密码不正确',
      });
  }

  private async audit(
    session: SessionContext,
    tenantId: bigint | undefined,
    credentialId: bigint | undefined,
    action: string,
    successValue: boolean,
    ip: string,
  ) {
    await this.prisma.mqttSecretAudit.create({
      data: {
        actorId: id(session.userid),
        actorName: session.name.slice(0, 100),
        tenantId,
        credentialId,
        action,
        success: successValue,
        ip: ip.slice(0, 64),
      },
    });
  }

  private platformInfo(row: { host: string; port: number; useTls: boolean }) {
    return {
      host: row.host,
      port: row.port,
      useTls: row.useTls,
      protocols: [...MQTT_PROTOCOLS],
    };
  }
}
