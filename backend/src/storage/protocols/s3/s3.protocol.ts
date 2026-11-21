import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { invalid } from '../../../common/validation.js';
import type {
  StorageDriver,
  StorageProtocolDefinition,
} from '../storage-protocol.types.js';

interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
  serverSideEncryption?: 'AES256' | 'aws:kms';
}

interface S3Secrets {
  accessKeyId: string;
  secretAccessKey: string;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseConfig(config: Record<string, unknown>): S3Config {
  const endpoint = text(config.endpoint);
  const bucket = text(config.bucket);
  const region = text(config.region) || 'us-east-1';
  const publicBaseUrl = text(config.publicBaseUrl);
  const serverSideEncryption = text(config.serverSideEncryption);
  if (!bucket) invalid('bucket 不能为空');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
    invalid('bucket 名称不合法');
  if (endpoint) {
    try {
      const url = new URL(endpoint);
      if (!['http:', 'https:'].includes(url.protocol))
        invalid('endpoint 必须是 HTTP(S) 地址');
    } catch {
      invalid('endpoint 必须是 HTTP(S) 地址');
    }
  }
  if (publicBaseUrl) {
    try {
      const url = new URL(publicBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol))
        invalid('publicBaseUrl 必须是 HTTP(S) 地址');
    } catch {
      invalid('publicBaseUrl 必须是 HTTP(S) 地址');
    }
  }
  if (
    serverSideEncryption &&
    !['AES256', 'aws:kms'].includes(serverSideEncryption)
  )
    invalid('serverSideEncryption 取值不合法');
  return {
    ...(endpoint ? { endpoint } : {}),
    region,
    bucket,
    forcePathStyle: config.forcePathStyle === true,
    ...(publicBaseUrl ? { publicBaseUrl } : {}),
    ...(serverSideEncryption
      ? { serverSideEncryption: serverSideEncryption as 'AES256' | 'aws:kms' }
      : {}),
  };
}

function parseSecrets(secrets: Record<string, unknown>): S3Secrets {
  const accessKeyId = text(secrets.accessKeyId);
  const secretAccessKey = text(secrets.secretAccessKey);
  if (!accessKeyId || !secretAccessKey)
    invalid('accessKeyId 和 secretAccessKey 不能为空');
  return { accessKeyId, secretAccessKey };
}

function client(config: S3Config, secrets: S3Secrets) {
  return new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: secrets.accessKeyId,
      secretAccessKey: secrets.secretAccessKey,
    },
  });
}

function driver(config: S3Config, secrets: S3Secrets): StorageDriver {
  const s3 = client(config, secrets);
  return {
    async upload({ key, body, contentType, size }) {
      const result = await s3.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentLength: size,
          ContentType: contentType,
          ...(config.serverSideEncryption
            ? { ServerSideEncryption: config.serverSideEncryption }
            : {}),
        }),
      );
      return result.ETag ? { etag: result.ETag.replaceAll('"', '') } : {};
    },
    async delete(key) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
    async signDownload(key, expiresInSeconds) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: expiresInSeconds },
      );
    },
    async healthCheck() {
      await s3.send(new HeadBucketCommand({ Bucket: config.bucket }));
    },
  };
}

export const s3Protocol: StorageProtocolDefinition = {
  protocol: 's3',
  label: 'S3 兼容对象存储',
  configFields: [
    {
      key: 'bucket',
      label: 'Bucket',
      type: 'text',
      required: true,
      placeholder: 'my-bucket',
    },
    {
      key: 'region',
      label: 'Region',
      type: 'text',
      required: true,
      placeholder: 'us-east-1',
      default: 'us-east-1',
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      type: 'text',
      placeholder: '留空使用 AWS；MinIO/R2 等填写服务地址',
    },
    {
      key: 'forcePathStyle',
      label: 'Path Style',
      type: 'boolean',
      default: false,
    },
    {
      key: 'publicBaseUrl',
      label: '公开访问前缀',
      type: 'text',
      placeholder: '可选，例如 CDN 域名',
    },
    {
      key: 'serverSideEncryption',
      label: '服务端加密',
      type: 'select',
      options: [
        { label: '不启用', value: '' },
        { label: 'SSE-S3 (AES256)', value: 'AES256' },
        { label: 'SSE-KMS', value: 'aws:kms' },
      ],
      default: '',
    },
  ],
  secretFields: [
    {
      key: 'accessKeyId',
      label: 'Access Key ID',
      type: 'password',
      required: true,
    },
    {
      key: 'secretAccessKey',
      label: 'Secret Access Key',
      type: 'password',
      required: true,
    },
  ],
  validate(config, secrets) {
    parseConfig(config);
    parseSecrets(secrets);
  },
  createDriver(config, secrets) {
    return driver(parseConfig(config), parseSecrets(secrets));
  },
};
