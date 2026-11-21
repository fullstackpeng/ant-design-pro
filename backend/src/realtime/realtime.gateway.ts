import type { IncomingMessage } from 'node:http';
import { Inject } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WebSocket, type WebSocketServer as WsServer } from 'ws';
import { AuthService } from '../auth/auth.service.js';
import {
  SESSION_COOKIE,
  type SessionContext,
} from '../auth/session-context.js';

const MAX_TEXT_LENGTH = 2000;

interface ClientState {
  session: SessionContext;
  connectedAt: string;
}

interface ClientFrame {
  type?: unknown;
  text?: unknown;
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

  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    const token = sessionToken(request);
    if (!token) {
      client.close(4401, 'Unauthorized');
      return;
    }
    try {
      const session = await this.auth.currentUser(token);
      this.clients.set(client, {
        session,
        connectedAt: new Date().toISOString(),
      });
      client.on('message', (data) => this.handleMessage(client, data));
      client.on('error', () => this.clients.delete(client));
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
    } catch {
      this.clients.delete(client);
      client.close(4401, 'Unauthorized');
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
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
