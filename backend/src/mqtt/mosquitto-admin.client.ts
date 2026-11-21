import { randomBytes } from 'node:crypto';
import { connect, type MqttClient } from 'mqtt';
import { DYNAMIC_SECURITY_REQUEST_TOPIC, mqttUrl } from './mqtt.constants.js';

export interface MqttAdminConfig {
  host: string;
  port: number;
  useTls: boolean;
  username: string;
  password: string;
  responseTopic: string;
  timeoutMs: number;
}

interface DynamicSecurityResponse {
  responses?: { command?: string; error?: string; data?: unknown }[];
}

/**
 * Mosquitto Dynamic Security is an MQTT topic API without request IDs, so
 * management commands must be serialized on a single connection.
 */
export class MosquittoAdminClient {
  private client: MqttClient | null = null;
  private readyPromise: Promise<MqttClient> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pending:
    | {
        resolve: (value: DynamicSecurityResponse) => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
      }
    | undefined;

  constructor(private readonly config: MqttAdminConfig) {}

  command<T = DynamicSecurityResponse>(
    command: Record<string, unknown>,
  ): Promise<T> {
    const run = this.queue.then(() => this.send(command));
    this.queue = run.catch(() => undefined);
    return run as Promise<T>;
  }

  async close(): Promise<void> {
    this.failPending(new Error('MQTT 管理连接已关闭'));
    const client = this.client;
    this.client = null;
    if (client) await client.endAsync(true).catch(() => undefined);
  }

  private async send(
    command: Record<string, unknown>,
  ): Promise<DynamicSecurityResponse> {
    const client = await this.ready();
    const response = new Promise<DynamicSecurityResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failPending(new Error('MQTT 管理命令超时'));
      }, this.config.timeoutMs);
      this.pending = { resolve, reject, timer };
    });
    client.publish(
      DYNAMIC_SECURITY_REQUEST_TOPIC,
      JSON.stringify({ commands: [command] }),
      { qos: 1 },
      (error) => {
        if (error) this.failPending(error);
      },
    );
    const result = await response;
    const entry = result.responses?.[0];
    if (entry?.error) throw new Error(entry.error);
    return result;
  }

  private ready(): Promise<MqttClient> {
    if (this.client?.connected) return Promise.resolve(this.client);
    if (this.readyPromise) return this.readyPromise;
    const promise = new Promise<MqttClient>((resolve, reject) => {
      const client = connect(
        mqttUrl(this.config.host, this.config.port, this.config.useTls),
        {
          protocolVersion: 4,
          clientId: `vibeflow-mqtt-admin-${randomBytes(6).toString('hex')}`,
          username: this.config.username,
          password: this.config.password,
          clean: true,
          reconnectPeriod: 0,
          connectTimeout: 5000,
        },
      );
      const timer = setTimeout(
        () => {
          client.end(true);
          reject(new Error('MQTT 管理连接超时'));
        },
        Math.min(this.config.timeoutMs, 8000),
      );
      client.once('error', (error) => {
        clearTimeout(timer);
        client.end(true);
        reject(error);
      });
      client.on('message', (_topic, payload) => {
        try {
          const parsed = JSON.parse(
            payload.toString(),
          ) as DynamicSecurityResponse;
          this.pending?.resolve(parsed);
          if (this.pending) clearTimeout(this.pending.timer);
          this.pending = undefined;
        } catch {
          this.failPending(new Error('MQTT 管理响应不是有效 JSON'));
        }
      });
      client.on('close', () => {
        this.client = null;
        this.failPending(new Error('MQTT 管理连接已断开'));
      });
      client.once('connect', () => {
        client.subscribe(this.config.responseTopic, { qos: 1 }, (error) => {
          clearTimeout(timer);
          if (error) {
            client.end(true);
            reject(error);
            return;
          }
          this.client = client;
          resolve(client);
        });
      });
    });
    this.readyPromise = promise.finally(() => {
      this.readyPromise = null;
    });
    return this.readyPromise;
  }

  private failPending(error: Error) {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending.reject(error);
    this.pending = undefined;
  }
}
