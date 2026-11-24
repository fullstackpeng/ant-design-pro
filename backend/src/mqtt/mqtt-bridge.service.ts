import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { connect, type MqttClient } from 'mqtt';
import { AuditAction } from '../audit/audit-action.js';
import { decryptSecrets } from '../common/secret-box.js';
import { PrismaService } from '../database/prisma.service.js';
import type { TenantMqttBroker } from '../generated/prisma/client.js';
import {
  decodePayload,
  encodePayload,
  isTenantTopic,
  type MqttProtocol,
  mqttProtocolVersion,
  mqttUrl,
  parseTenantCode,
  tenantTopicBase,
} from './mqtt.constants.js';
import { MqttCredentialsService } from './mqtt-credentials.service.js';
import { MqttMessagesService } from './mqtt-messages.service.js';
import { PlatformMqttBrokerService } from './platform-broker.service.js';
import { TenantMqttBrokersService } from './tenant-brokers.service.js';

export interface MqttTarget {
  brokerType: 'platform' | 'tenant';
  brokerId: bigint;
  tenantId: bigint;
  tenantCode: string;
  protocolVersion: MqttProtocol;
}

export interface InboundEvent {
  tenantId: string;
  brokerType: 'platform' | 'tenant';
  brokerId: string;
  topic: string;
  payload: string;
  payloadEncoding: string;
  qos: number;
  retain: boolean;
  at: string;
}

export interface TestConnection {
  subscribe(topic: string, qos: number): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  publish(
    topic: string,
    payload: string,
    qos: number,
    retain: boolean,
  ): Promise<void>;
  close(): Promise<void>;
}

const OUTBOX_POLL_MS = Number(process.env.MQTT_OUTBOX_POLL_MS ?? 5000);

@Injectable()
export class MqttBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBridgeService.name);
  private readonly persistent = new Map<
    string,
    { client: MqttClient; target: MqttTarget }
  >();
  private readonly tenantCache = new Map<string, bigint>();
  private readonly listeners = new Set<(event: InboundEvent) => void>();
  private readonly recentOutbound = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  private outboxBusy = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlatformMqttBrokerService)
    private readonly platform: PlatformMqttBrokerService,
    @Inject(TenantMqttBrokersService)
    private readonly tenantBrokers: TenantMqttBrokersService,
    @Inject(MqttCredentialsService)
    private readonly credentials: MqttCredentialsService,
    @Inject(MqttMessagesService)
    private readonly messages: MqttMessagesService,
  ) {}

  onModuleInit() {
    if (!Number.isFinite(OUTBOX_POLL_MS) || OUTBOX_POLL_MS <= 0) return;
    this.timer = setInterval(
      () =>
        void this.processOutbox().catch((error) =>
          this.logger.warn(`MQTT Outbox 轮询失败：${error.message}`),
        ),
      OUTBOX_POLL_MS,
    );
    this.timer.unref();
    setTimeout(() => {
      void this.startPersistent().catch((error: Error) =>
        this.logger.warn(`MQTT Bridge 启动失败：${error.message}`),
      );
    }, 0).unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    for (const entry of this.persistent.values()) {
      await entry.client.endAsync(true).catch(() => undefined);
    }
    this.persistent.clear();
  }

  status() {
    return [...this.persistent.entries()].map(([key, entry]) => ({
      key,
      connected: entry.client.connected,
      brokerType: entry.target.brokerType,
      brokerId: entry.target.brokerId.toString(),
      tenantCode: entry.target.tenantCode,
    }));
  }

  subscription(listener: (event: InboundEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async startPersistent() {
    await this.startPlatformConnection();
    const brokers = await this.tenantBrokers.listActive();
    await Promise.all(
      brokers.map((broker) => this.startTenantConnection(broker)),
    );
  }

  async stopTenant(brokerId: bigint) {
    const key = `tenant:${brokerId}`;
    const entry = this.persistent.get(key);
    if (!entry) return;
    this.persistent.delete(key);
    await entry.client.endAsync(true).catch(() => undefined);
  }

  async restartPlatform() {
    const entry = this.persistent.get('platform');
    if (entry) {
      await entry.client.endAsync(true).catch(() => undefined);
      this.persistent.delete('platform');
    }
    await this.startPlatformConnection();
  }

  @AuditAction({
    event: 'mqtt-admin.reconnect',
    name: '重新连接 MQTT Bridge',
    mode: 'external',
  })
  async reconnectManually() {
    await this.restartPlatform();
  }

  @AuditAction({
    event: 'mqtt-admin.processOutbox',
    name: '重试 MQTT 发件箱',
    mode: 'external',
  })
  async processOutboxManually() {
    await this.processOutbox();
  }

  async openTest(
    target: MqttTarget,
    onMessage: (event: InboundEvent) => void,
  ): Promise<TestConnection> {
    const { config, username, password } =
      await this.resolveCredentials(target);
    const client = await this.connect({
      host: config.host,
      port: config.port,
      useTls: config.useTls,
      username,
      password,
      protocolVersion: mqttProtocolVersion(target.protocolVersion),
      clientId: `vibeflow-test-${randomBytes(6).toString('hex')}`,
      clean: true,
      reconnectPeriod: 0,
    });
    client.on('message', (topic, payload, packet) => {
      const encoded = encodePayload(payload);
      onMessage({
        tenantId: target.tenantId.toString(),
        brokerType: target.brokerType,
        brokerId: target.brokerId.toString(),
        topic,
        payload: encoded.payload,
        payloadEncoding: encoded.encoding,
        qos: packet.qos,
        retain: packet.retain,
        at: new Date().toISOString(),
      });
    });
    return {
      subscribe: (topic, qos) =>
        this.requestWithTimeout(
          (callback) =>
            client.subscribe(topic, { qos: qos as 0 | 1 | 2 }, callback),
          'MQTT 订阅',
        ),
      unsubscribe: (topic) =>
        this.requestWithTimeout(
          (callback) => client.unsubscribe(topic, callback),
          'MQTT 取消订阅',
        ),
      publish: (topic, payload, qos, retain) =>
        this.requestWithTimeout(
          (callback) =>
            client.publish(
              topic,
              decodePayload(payload, 'utf8'),
              { qos: qos as 0 | 1 | 2, retain },
              callback,
            ),
          'MQTT 发布',
        ),
      close: () => client.endAsync(true),
    };
  }

  async publish(
    target: MqttTarget,
    topic: string,
    payload: string,
    payloadEncoding: string,
    qos: number,
    retain: boolean,
  ) {
    this.validateTopic(target, topic);
    const message = await this.messages.record({
      tenantId: target.tenantId,
      brokerType: target.brokerType,
      brokerId: target.brokerId,
      topic,
      payload,
      payloadEncoding,
      qos,
      retain,
      direction: 'outbound',
      idempotencyKey: `outbound:${target.brokerType}:${target.brokerId}:${Date.now()}:${randomBytes(6).toString('hex')}`,
    });
    const echoKey = this.echoKey(
      target.brokerType,
      target.brokerId,
      topic,
      decodePayload(payload, payloadEncoding),
    );
    this.recentOutbound.set(echoKey, Date.now());
    for (const [key, at] of this.recentOutbound)
      if (Date.now() - at > 60_000) this.recentOutbound.delete(key);
    const outbox = await this.prisma.mqttOutbox.create({
      data: {
        tenantId: target.tenantId,
        brokerType: target.brokerType,
        brokerId: target.brokerId,
        topic,
        payload,
        payloadEncoding,
        qos,
        retain,
      },
    });
    const sent = await this.publishOutbox(outbox.id);
    return { id: message?.id ?? null, sent };
  }

  private async startPlatformConnection() {
    const existing = this.persistent.get('platform');
    if (existing?.client.connected) return;
    if (existing) {
      this.persistent.delete('platform');
      await existing.client.endAsync(true).catch(() => undefined);
    }
    const config = await this.platform.raw();
    if (!config?.isEnabled) return;
    const bridge = this.platform.bridgeCredentials(config);
    try {
      const client = await this.connect({
        host: config.host,
        port: config.port,
        useTls: config.useTls,
        username: bridge.username,
        password: bridge.password,
        protocolVersion: mqttProtocolVersion(config.defaultProtocol),
        clientId: 'vibeflow-platform-bridge',
        clean: false,
      });
      const target: MqttTarget = {
        brokerType: 'platform',
        brokerId: 1n,
        tenantId: 0n,
        tenantCode: '',
        protocolVersion: config.defaultProtocol as MqttProtocol,
      };
      this.bindPersistent(client, target, 'tenants/#');
      this.persistent.set('platform', { client, target });
    } catch (error) {
      this.logger.error(
        `平台 MQTT Bridge 连接失败：${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async startTenantConnection(
    broker: TenantMqttBroker & { tenant: { code: string } },
  ) {
    const key = `tenant:${broker.id}`;
    const existing = this.persistent.get(key);
    if (existing?.client.connected) return;
    if (existing) {
      this.persistent.delete(key);
      await existing.client.endAsync(true).catch(() => undefined);
    }
    try {
      const credentials = this.tenantBrokers.credentials(broker);
      const client = await this.connect({
        host: broker.host,
        port: broker.port,
        useTls: broker.useTls,
        username: credentials.username,
        password: credentials.password,
        protocolVersion: mqttProtocolVersion(broker.protocolVersion),
        clientId:
          broker.clientIdPrefix ||
          `vibeflow-tenant-${broker.tenantId}-${broker.id}`,
        clean: broker.cleanStart,
      });
      const target: MqttTarget = {
        brokerType: 'tenant',
        brokerId: broker.id,
        tenantId: broker.tenantId,
        tenantCode: broker.tenant.code,
        protocolVersion: broker.protocolVersion as MqttProtocol,
      };
      this.bindPersistent(client, target, broker.subscribeFilter);
      this.persistent.set(key, { client, target });
    } catch (error) {
      this.logger.error(
        `租户 MQTT Broker ${broker.id} 连接失败：${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private bindPersistent(
    client: MqttClient,
    target: MqttTarget,
    filter: string,
  ) {
    const subscribe = () => {
      client.subscribe(
        filter,
        { qos: target.brokerType === 'platform' ? 1 : 0 },
        (error) => {
          if (error)
            this.logger.error(`MQTT 订阅失败 ${filter}: ${error.message}`);
        },
      );
    };
    if (client.connected) subscribe();
    client.on('connect', subscribe);
    client.on('error', (error) => {
      this.logger.warn(`MQTT 连接错误 ${target.brokerType}: ${error.message}`);
    });
    client.handleMessage = (packet, callback) => {
      void this.persistInbound(target, packet)
        .then(() => callback())
        .catch((error: Error) => {
          this.logger.error(
            `MQTT 入站消息落库失败，将等待重投：${error.message}`,
          );
        });
    };
  }

  private async persistInbound(
    target: MqttTarget,
    packet: {
      topic: string;
      payload: Buffer | string;
      qos: number;
      retain: boolean;
      messageId?: number;
    },
  ) {
    const raw = Buffer.isBuffer(packet.payload)
      ? packet.payload
      : Buffer.from(packet.payload);
    const encoded = encodePayload(raw);
    const tenantId =
      target.brokerType === 'platform'
        ? await this.tenantIdForTopic(packet.topic)
        : target.tenantId;
    if (!tenantId) {
      this.logger.warn(`无法识别租户的 MQTT 主题：${packet.topic}`);
      return;
    }
    const echoKey = this.echoKey(
      target.brokerType,
      target.brokerId,
      packet.topic,
      raw,
    );
    const echoedAt = this.recentOutbound.get(echoKey);
    if (echoedAt && Date.now() - echoedAt < 60_000) {
      this.recentOutbound.delete(echoKey);
      return;
    }
    const hash = createHash('sha1').update(raw).digest('hex').slice(0, 16);
    // QoS 0 has no packet id and no retransmission, so identical payloads are
    // distinct messages. QoS 1/2 retransmissions share the packet id and hash.
    const key =
      packet.qos === 0
        ? `inbound:${target.brokerType}:${target.brokerId}:${packet.topic}:${Date.now()}:${randomBytes(6).toString('hex')}`
        : `inbound:${target.brokerType}:${target.brokerId}:${packet.topic}:${packet.messageId ?? 0}:${hash}`;
    await this.messages.record({
      tenantId,
      brokerType: target.brokerType,
      brokerId: target.brokerId,
      topic: packet.topic,
      payload: encoded.payload,
      payloadEncoding: encoded.encoding,
      qos: packet.qos,
      retain: packet.retain,
      direction: 'inbound',
      idempotencyKey: key,
    });
    this.emit({
      tenantId: tenantId.toString(),
      brokerType: target.brokerType,
      brokerId: target.brokerId.toString(),
      topic: packet.topic,
      payload: encoded.payload,
      payloadEncoding: encoded.encoding,
      qos: packet.qos,
      retain: packet.retain,
      at: new Date().toISOString(),
    });
  }

  private echoKey(
    brokerType: string,
    brokerId: bigint,
    topic: string,
    payload: Uint8Array,
  ) {
    return `${brokerType}:${brokerId}:${topic}:${createHash('sha1')
      .update(payload)
      .digest('hex')}`;
  }

  private async tenantIdForTopic(topic: string) {
    const code = parseTenantCode(topic);
    if (!code) return null;
    const cached = this.tenantCache.get(code);
    if (cached) return cached;
    const tenant = await this.prisma.tenant.findUnique({
      where: { code },
      select: { id: true },
    });
    if (tenant) this.tenantCache.set(code, tenant.id);
    return tenant?.id ?? null;
  }

  private emit(event: InboundEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A failing browser listener must not block the bridge.
      }
    }
  }

  private async publishOutbox(outboxId: bigint) {
    const row = await this.prisma.mqttOutbox.findUnique({
      where: { id: outboxId },
    });
    if (!row || row.status === 'sent') return true;
    if (/[#+]/.test(row.topic)) {
      await this.prisma.mqttOutbox.update({
        where: { id: row.id },
        data: {
          status: 'failed',
          lastError: '发布主题不能包含通配符，已停止重试',
          nextAttemptAt: new Date(Date.now() + 365 * 86400000),
        },
      });
      return false;
    }
    const target: MqttTarget = {
      brokerType: row.brokerType as 'platform' | 'tenant',
      brokerId: row.brokerId,
      tenantId: row.tenantId,
      tenantCode: '',
      protocolVersion: '3.1.1',
    };
    try {
      const client = await this.connectionFor(target);
      await this.requestWithTimeout(
        (callback) =>
          client.publish(
            row.topic,
            decodePayload(row.payload, row.payloadEncoding),
            { qos: row.qos as 0 | 1 | 2, retain: row.retain },
            callback,
          ),
        'MQTT 发布确认',
      );
      await this.prisma.mqttOutbox.update({
        where: { id: row.id },
        data: { status: 'sent', lastError: '' },
      });
      return true;
    } catch (error) {
      const attempts = row.attempts + 1;
      await this.prisma.mqttOutbox.update({
        where: { id: row.id },
        data: {
          status: 'failed',
          attempts,
          lastError: this.errorMessage(error).slice(0, 2000),
          nextAttemptAt: new Date(
            Date.now() + Math.min(60, 2 ** Math.min(attempts, 6)) * 1000,
          ),
        },
      });
      return false;
    }
  }

  private errorMessage(error: unknown) {
    const response = (
      error as { getResponse?: () => { errorMessage?: unknown } }
    )?.getResponse?.();
    if (response && typeof response.errorMessage === 'string')
      return response.errorMessage;
    return error instanceof Error ? error.message : '发布失败';
  }

  async processOutbox() {
    if (this.outboxBusy) return;
    this.outboxBusy = true;
    try {
      const rows = await this.prisma.mqttOutbox.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
          nextAttemptAt: { lte: new Date() },
        },
        orderBy: { id: 'asc' },
        take: 20,
      });
      for (const row of rows) await this.publishOutbox(row.id);
    } finally {
      this.outboxBusy = false;
    }
  }

  private async connectionFor(target: MqttTarget): Promise<MqttClient> {
    if (target.brokerType === 'platform') {
      const entry = this.persistent.get('platform');
      if (entry?.client.connected) return entry.client;
      await this.startPlatformConnection();
      const started = this.persistent.get('platform');
      if (!started?.client.connected)
        throw new ConflictException({
          success: false,
          errorMessage: '平台 MQTT Bridge 未连接',
        });
      return started.client;
    }
    const key = `tenant:${target.brokerId}`;
    const entry = this.persistent.get(key);
    if (entry?.client.connected) return entry.client;
    const broker = await this.tenantBrokers.findOrThrow(target.brokerId);
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: broker.tenantId },
      select: { code: true },
    });
    await this.startTenantConnection({ ...broker, tenant });
    const started = this.persistent.get(key);
    if (!started?.client.connected)
      throw new ConflictException({
        success: false,
        errorMessage: '租户 MQTT Broker 未连接',
      });
    return started.client;
  }

  private async resolveCredentials(target: MqttTarget) {
    if (target.brokerType === 'platform') {
      const config = await this.platform.required();
      const credential = await this.prisma.tenantMqttCredential.findUnique({
        where: {
          tenantId_platformBrokerId: {
            tenantId: target.tenantId,
            platformBrokerId: 1,
          },
        },
      });
      if (credential?.status !== 'provisioned')
        throw new BadRequestException({
          success: false,
          errorMessage: '该租户的平台 Broker 凭据尚未开通',
        });
      const secret = decryptSecrets(credential.password);
      return {
        config,
        username: credential.username,
        password: typeof secret.password === 'string' ? secret.password : '',
      };
    }
    const broker = await this.tenantBrokers.findOrThrow(target.brokerId);
    if (broker.tenantId !== target.tenantId)
      throw new BadRequestException({
        success: false,
        errorMessage: 'Broker 不属于当前租户',
      });
    const credentials = this.tenantBrokers.credentials(broker);
    return {
      config: broker,
      username: credentials.username,
      password: credentials.password,
    };
  }

  private validateTopic(target: MqttTarget, topic: string) {
    if (topic.includes('#') || topic.includes('+'))
      throw new BadRequestException({
        success: false,
        errorMessage: '发布主题不能包含通配符 + 或 #',
      });
    if (target.brokerType !== 'platform') return;
    const code = target.tenantCode;
    if (!code || !isTenantTopic(code, topic))
      throw new BadRequestException({
        success: false,
        errorMessage: `平台 Broker 只允许访问 ${tenantTopicBase(code)}/ 下的主题`,
      });
  }

  private async connect(options: {
    host: string;
    port: number;
    useTls: boolean;
    username?: string;
    password?: string;
    protocolVersion: 4 | 5;
    clientId: string;
    clean: boolean;
    reconnectPeriod?: number;
  }): Promise<MqttClient> {
    const client = connect(
      mqttUrl(options.host, options.port, options.useTls),
      {
        protocolVersion: options.protocolVersion,
        clientId: options.clientId,
        username: options.username,
        password: options.password,
        clean: options.clean,
        reconnectPeriod: options.reconnectPeriod ?? 2000,
        connectTimeout: 5000,
      },
    );
    // Keep later reconnects from raising unhandled errors; callers log as needed.
    client.on('error', () => undefined);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end(true);
        reject(new Error('MQTT 连接超时'));
      }, 6000);
      client.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      client.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    return client;
  }

  private requestWithTimeout(
    work: (callback: (error?: Error | null) => void) => unknown,
    label: string,
    timeoutMs = 8000,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label}超时`)),
        timeoutMs,
      );
      try {
        work((error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}
