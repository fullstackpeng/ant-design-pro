import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { InternalServerErrorException } from '@nestjs/common';

const KEY_ENV = 'SECRET_ENCRYPTION_KEY';
const LEGACY_KEY_ENV = 'STORAGE_SECRET_KEY';
const VERSION = 'v1';

function masterKey(): Buffer {
  const raw = process.env[KEY_ENV] || process.env[LEGACY_KEY_ENV];
  if (!raw)
    throw new InternalServerErrorException({
      success: false,
      errorMessage: `未配置 ${KEY_ENV}（或 STORAGE_SECRET_KEY），无法保存密钥`,
    });
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32)
    throw new InternalServerErrorException({
      success: false,
      errorMessage: `${KEY_ENV} 必须是 32 字节的 base64 字符串`,
    });
  return key;
}

export function encryptSecrets(secrets: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(secrets), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptSecrets(envelope: string): Record<string, unknown> {
  const [version, ivText, tagText, dataText] = envelope.split(':');
  if (version !== VERSION || !ivText || !tagText || !dataText)
    throw new InternalServerErrorException({
      success: false,
      errorMessage: '服务密钥格式无效，请联系平台管理员',
    });
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      masterKey(),
      Buffer.from(ivText, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataText, 'base64')),
      decipher.final(),
    ]);
    const parsed: unknown = JSON.parse(plaintext.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('invalid payload');
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InternalServerErrorException) throw error;
    throw new InternalServerErrorException({
      success: false,
      errorMessage: '服务密钥解密失败，请检查 SECRET_ENCRYPTION_KEY',
    });
  }
}
