import { randomBytes } from 'node:crypto';
import { TextDecoder } from 'node:util';

export const MQTT_FEATURE = 'mqtt';
export const MQTT_PROTOCOLS = ['3.1.1', '5'] as const;
export type MqttProtocol = (typeof MQTT_PROTOCOLS)[number];

export const DYNAMIC_SECURITY_REQUEST_TOPIC = '$CONTROL/dynamic-security/v1';
export const DYNAMIC_SECURITY_RESPONSE_TOPIC =
  '$CONTROL/dynamic-security/v1/response';

export function mqttProtocolVersion(protocol: string): 4 | 5 {
  return protocol === '5' ? 5 : 4;
}

export function mqttUrl(host: string, port: number, useTls: boolean) {
  return `${useTls ? 'mqtts' : 'mqtt'}://${host}:${port}`;
}

export function tenantTopicPrefix(tenantCode: string) {
  return `tenants/${tenantCode}/#`;
}

export function tenantTopicBase(tenantCode: string) {
  return `tenants/${tenantCode}`;
}

export function isTenantTopic(tenantCode: string, topic: string) {
  const base = tenantTopicBase(tenantCode);
  return topic === base || topic.startsWith(`${base}/`);
}

export function parseTenantCode(topic: string): string | null {
  const match = /^tenants\/([^/#]+)\//.exec(topic);
  return match?.[1] ?? null;
}

const utf8 = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();

export function encodePayload(payload: Uint8Array): {
  payload: string;
  encoding: 'utf8' | 'base64';
} {
  try {
    return {
      payload: utf8.decode(payload),
      encoding: 'utf8',
    };
  } catch {
    return {
      payload: Buffer.from(payload).toString('base64'),
      encoding: 'base64',
    };
  }
}

export function decodePayload(payload: string, encoding: string): Buffer {
  return encoding === 'base64'
    ? Buffer.from(payload, 'base64')
    : Buffer.from(encoder.encode(payload));
}

/** MQTT topic filter matching for + and #. */
export function topicMatches(filter: string, topic: string): boolean {
  const filterLevels = filter.split('/');
  const topicLevels = topic.split('/');
  for (let index = 0; index < filterLevels.length; index += 1) {
    const level = filterLevels[index];
    if (level === '#') return true;
    if (index >= topicLevels.length) return false;
    if (level !== '+' && level !== topicLevels[index]) return false;
  }
  return filterLevels.length === topicLevels.length;
}

export function randomPassword(): string {
  return randomBytes(24).toString('base64url');
}
