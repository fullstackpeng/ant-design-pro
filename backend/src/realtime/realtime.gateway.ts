import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WebSocket, type WebSocketServer as WsServer } from 'ws';
import { AuditAction } from '../audit/audit-action.js';
import { auditContext, recordAuditTarget } from '../audit/audit-context.js';
import { AuthService } from '../auth/auth.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import {
  SESSION_COOKIE,
  type SessionContext,
} from '../auth/session-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { MQTT_PROTOCOLS, type MqttProtocol } from '../mqtt/mqtt.constants.js';
import {
  MqttBridgeService,
  type MqttTarget,
  type TestConnection,
} from '../mqtt/mqtt-bridge.service.js';
import { TenantMqttBrokersService } from '../mqtt/tenant-brokers.service.js';

const MAX_TEXT_LENGTH = 2000;

interface ClientState {
  session: SessionContext;
  connectedAt: string;
  ip: string;
  userAgent: string;
}

interface ClientFrame {
  type?: unknown;
  text?: unknown;
  [key: string]: unknown;
}

function sessionToken(request: IncomingMessage): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) return token;
  }
  const cookie = request.headers.cookie;
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

function tenantScope(session: SessionContext): string {
  return session.tenant?.id ?? 'platform';
}

/**
 * Minimal, authenticated WebSocket channel used by the test page and by
 * external tools such as wscat or Postman. It is intentionally in-memory:
 * multi-instance deployments would need a shared broadcast layer.
 */
@WebSocketGateway({ path: '/api/ws', maxPayload: 64 * 1024 })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: WsServer;

  private readonly clients = new Map<WebSocket, ClientState>();
  private readonly mqttTests = new Map<
    WebSocket,
    { connection: TestConnection; target: MqttTarget }
  >();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MqttBridgeService)
    private readonly mqtt: MqttBridgeService,
    @Inject(TenantMqttBrokersService)
    private readonly tenantBrokers: TenantMqttBrokersService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    const token = sessionToken(request);
    if (!token) {
      client.close(4401, 'Unauthorized');
      return;
    }
    // Buffer frames until the asynchronous session check completes, otherwise a
    // client that sends immediately after the handshake can lose its first frame.
    const pending: unknown[] = [];
    let ready = false;
    client.on('message', (data) => {
      if (!ready) {
        pending.push(data);
        return;
      }
      this.handleMessage(client, data);
    });
    client.on('error', () => this.clients.delete(client));
    try {
      const session = await this.auth.currentUser(token);
      this.clients.set(client, {
        session,
        connectedAt: new Date().toISOString(),
        ip: request.socket.remoteAddress ?? '',
        userAgent: String(request.headers['user-agent'] ?? '').slice(0, 500),
      });
      this.send(client, {
        type: 'welcome',
        at: new Date().toISOString(),
        user: {
          id: session.userid,
          name: session.name,
          isPlatformAdmin: session.isPlatformAdmin,
        },
        tenant: session.tenant
          ? { code: session.tenant.code, name: session.tenant.name }
          : null,
      });
      ready = true;
      for (const data of pending.splice(0)) this.handleMessage(client, data);
    } catch {
      this.clients.delete(client);
      client.close(4401, 'Unauthorized');
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    void this.closeMqttTest(client);
  }

  private handleMessage(client: WebSocket, data: unknown) {
    const state = this.clients.get(client);
    if (!state) return;
    let frame: ClientFrame;
    try {
      const parsed: unknown = JSON.parse(String(data));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('invalid frame');
      frame = parsed as ClientFrame;
    } catch {
      this.error(client, '消息必须是 JSON 对象');
      return;
    }
    if (typeof frame.type === 'string' && frame.type.startsWith('mqtt.')) {
      void this.handleMqtt(client, state, frame);
      return;
    }
    if (frame.type === 'ping') {
      this.send(client, { type: 'pong', at: new Date().toISOString() });
      return;
    }
    if (frame.type === 'echo' || frame.type === 'broadcast') {
      if (typeof frame.text !== 'string' || !frame.text.trim()) {
        this.error(client, 'text 必须是非空字符串');
        return;
      }
      const text = frame.text.slice(0, MAX_TEXT_LENGTH);
      const at = new Date().toISOString();
      if (frame.type === 'echo') {
        this.send(client, {
          type: 'echo',
          text,
          at,
          from: state.session.name,
        });
        return;
      }
      this.broadcast(state, {
        type: 'broadcast',
        text,
        at,
        from: state.session.name,
        tenantCode: state.session.tenant?.code ?? null,
      });
      return;
    }
    this.error(client, '支持的类型：ping、echo、broadcast');
  }

  private async handleMqtt(
    client: WebSocket,
    state: ClientState,
    frame: ClientFrame,
  ) {
    try {
      await auditContext.run(
        {
          requestId: randomUUID(),
          session: state.session,
          ip: state.ip,
          userAgent: state.userAgent,
        },
        () => this.performMqtt(client, state, frame),
      );
    } catch (error) {
      this.send(client, {
        type: 'mqtt.error',
        message: this.mqttErrorMessage(error),
      });
    }
  }

  @AuditAction({
    event: 'realtime.mqtt',
    name: 'WebSocket MQTT 操作',
    mode: 'external',
    entity: 'mqttTest',
  })
  private async performMqtt(
    client: WebSocket,
    state: ClientState,
    frame: ClientFrame,
  ) {
    auditContext.getStore()?.action?.changes.push({
      entity: 'mqttTest',
      operation: String(frame.type).slice(0, 80),
      before: {},
      after: {},
    });
    if (frame.type === 'mqtt.connect') {
      const target = await this.resolveMqttTarget(state.session, frame);
      recordAuditTarget('mqttTest', {
        id: target.brokerId,
        tenantId: target.tenantId,
      });
      await this.closeMqttTest(client);
      const connection = await this.mqtt.openTest(target, (event) =>
        this.send(client, { type: 'mqtt.message', ...event }),
      );
      this.mqttTests.set(client, { connection, target });
      this.send(client, {
        type: 'mqtt.connected',
        brokerType: target.brokerType,
        brokerId: target.brokerId.toString(),
        tenantId: target.tenantId.toString(),
        protocolVersion: target.protocolVersion,
      });
      return;
    }
    if (frame.type === 'mqtt.disconnect') {
      const target = this.mqttTests.get(client)?.target;
      if (target)
        recordAuditTarget('mqttTest', {
          id: target.brokerId,
          tenantId: target.tenantId,
        });
      await this.closeMqttTest(client);
      this.send(client, { type: 'mqtt.disconnected' });
      return;
    }
    const test = this.mqttTests.get(client);
    if (!test)
      throw new BadRequestException({
        success: false,
        errorMessage: '请先发送 mqtt.connect',
      });
    recordAuditTarget('mqttTest', {
      id: test.target.brokerId,
      tenantId: test.target.tenantId,
    });
    if (frame.type === 'mqtt.subscribe') {
      const topic = this.requireTopic(frame.topic);
      const qos = this.requireQos(frame.qos);
      await test.connection.subscribe(topic, qos);
      this.send(client, { type: 'mqtt.subscribed', topic, qos });
      return;
    }
    if (frame.type === 'mqtt.unsubscribe') {
      const topic = this.requireTopic(frame.topic);
      await test.connection.unsubscribe(topic);
      this.send(client, { type: 'mqtt.unsubscribed', topic });
      return;
    }
    if (frame.type === 'mqtt.publish') {
      const topic = this.requireTopic(frame.topic);
      const qos = this.requireQos(frame.qos);
      const payload =
        typeof frame.payload === 'string'
          ? frame.payload
          : JSON.stringify(frame.payload ?? '');
      if (payload.length > 64 * 1024)
        throw new BadRequestException({
          success: false,
          errorMessage: '消息内容超过 64KB',
        });
      const result = await this.mqtt.publish(
        test.target,
        topic,
        payload,
        'utf8',
        qos,
        frame.retain === true,
      );
      const audit = auditContext.getStore();
      if (audit && !result.sent)
        audit.outcome = {
          result: 'accepted',
          message: '消息已进入发送队列，尚未确认发送成功',
        };
      this.send(client, {
        type: 'mqtt.published',
        id: result.id?.toString() ?? null,
        sent: result.sent,
      });
      return;
    }
    throw new BadRequestException({
      success: false,
      errorMessage:
        '支持的 MQTT 操作：connect、disconnect、subscribe、unsubscribe、publish',
    });
  }

  private async resolveMqttTarget(
    session: SessionContext,
    frame: ClientFrame,
  ): Promise<MqttTarget> {
    const brokerType = frame.brokerType === 'tenant' ? 'tenant' : 'platform';
    const protocol =
      typeof frame.protocolVersion === 'string' &&
      (MQTT_PROTOCOLS as readonly string[]).includes(frame.protocolVersion)
        ? (frame.protocolVersion as MqttProtocol)
        : undefined;
    const requestedTenant =
      typeof frame.tenantId === 'string' && frame.tenantId
        ? this.requireDatabaseId(frame.tenantId, 'tenantId')
        : undefined;
    if (!session.isPlatformAdmin) {
      await this.authorization.requireFeature(session, 'mqtt');
      await this.authorization.requirePermission(session, 'mqtt:test');
      if (!session.tenant)
        throw new ForbiddenException({
          success: false,
          errorMessage: '需要租户身份',
        });
      if (
        requestedTenant !== undefined &&
        requestedTenant !== BigInt(session.tenant.id)
      )
        throw new ForbiddenException({
          success: false,
          errorMessage: '不能访问其他租户的 MQTT',
        });
    }
    if (brokerType === 'tenant') {
      const brokerId = this.requireDatabaseId(frame.brokerId, 'brokerId');
      const broker = await this.tenantBrokers.findOrThrow(brokerId);
      if (!session.isPlatformAdmin) {
        if (!session.tenant || BigInt(session.tenant.id) !== broker.tenantId)
          throw new ForbiddenException({
            success: false,
            errorMessage: '不能访问其他租户的 Broker',
          });
      } else if (
        requestedTenant !== undefined &&
        requestedTenant !== broker.tenantId
      )
        throw new BadRequestException({
          success: false,
          errorMessage: 'brokerId 与 tenantId 不匹配',
        });
      const tenant = await this.prisma.tenant.findUniqueOrThrow({
        where: { id: broker.tenantId },
        select: { code: true },
      });
      return {
        brokerType: 'tenant',
        brokerId,
        tenantId: broker.tenantId,
        tenantCode: tenant.code,
        protocolVersion: protocol ?? (broker.protocolVersion as MqttProtocol),
      };
    }
    if (!session.isPlatformAdmin) {
      const tenant = session.tenant;
      if (!tenant)
        throw new ForbiddenException({
          success: false,
          errorMessage: '需要租户身份',
        });
      return {
        brokerType: 'platform',
        brokerId: 1n,
        tenantId: BigInt(tenant.id),
        tenantCode: tenant.code,
        protocolVersion: protocol ?? '3.1.1',
      };
    }
    if (requestedTenant === undefined)
      throw new BadRequestException({
        success: false,
        errorMessage: '平台端测试平台 Broker 时必须选择租户',
      });
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: requestedTenant },
      select: { code: true },
    });
    return {
      brokerType: 'platform',
      brokerId: 1n,
      tenantId: requestedTenant,
      tenantCode: tenant.code,
      protocolVersion: protocol ?? '3.1.1',
    };
  }

  private requireDatabaseId(value: unknown, field: string) {
    const text = typeof value === 'string' ? value : String(value ?? '');
    if (!/^[1-9]\d{0,18}$/.test(text))
      throw new BadRequestException({
        success: false,
        errorMessage: `${field} 必须是正整数 ID`,
      });
    return BigInt(text);
  }

  private requireTopic(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.length > 512)
      throw new BadRequestException({
        success: false,
        errorMessage: 'topic 必须是非空字符串且不超过 512 字符',
      });
    return value;
  }

  private requireQos(value: unknown) {
    if (value !== 0 && value !== 1 && value !== 2)
      throw new BadRequestException({
        success: false,
        errorMessage: 'qos 只能是 0、1 或 2',
      });
    return value;
  }

  private mqttErrorMessage(error: unknown) {
    const response = (
      error as { getResponse?: () => { errorMessage?: unknown } }
    )?.getResponse?.();
    if (response && typeof response.errorMessage === 'string')
      return response.errorMessage;
    return error instanceof Error ? error.message : 'MQTT 操作失败';
  }

  private async closeMqttTest(client: WebSocket) {
    const test = this.mqttTests.get(client);
    this.mqttTests.delete(client);
    if (test) await test.connection.close().catch(() => undefined);
  }

  private broadcast(state: ClientState, payload: Record<string, unknown>) {
    const scope = tenantScope(state.session);
    for (const [client, other] of this.clients) {
      if (tenantScope(other.session) === scope) this.send(client, payload);
    }
  }

  private send(client: WebSocket, payload: Record<string, unknown>) {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(payload));
  }

  private error(client: WebSocket, message: string) {
    this.send(client, {
      type: 'error',
      message,
      at: new Date().toISOString(),
    });
  }
}
