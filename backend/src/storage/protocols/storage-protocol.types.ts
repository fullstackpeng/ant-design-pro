import type { Readable } from 'node:stream';

export type StorageFieldType =
  | 'text'
  | 'password'
  | 'boolean'
  | 'number'
  | 'select';

export interface StorageFieldMeta {
  key: string;
  label: string;
  type: StorageFieldType;
  required?: boolean;
  placeholder?: string;
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
}

export interface StorageProtocolMeta {
  protocol: string;
  label: string;
  configFields: StorageFieldMeta[];
  secretFields: StorageFieldMeta[];
}

export interface StorageUploadInput {
  key: string;
  body: Readable;
  contentType: string;
  size: number;
}

export interface StorageDriver {
  upload(input: StorageUploadInput): Promise<{ etag?: string }>;
  delete(key: string): Promise<void>;
  signDownload(key: string, expiresInSeconds: number): Promise<string>;
  healthCheck(): Promise<void>;
}

export interface StorageProtocolDefinition extends StorageProtocolMeta {
  validate(
    config: Record<string, unknown>,
    secrets: Record<string, unknown>,
  ): void;
  createDriver(
    config: Record<string, unknown>,
    secrets: Record<string, unknown>,
  ): StorageDriver;
}
