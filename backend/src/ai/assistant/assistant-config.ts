import { invalid } from '../../common/validation.js';
import type { RetrievalConfig } from '../common/ai.types.js';

export function retrievalConfig(value: unknown): RetrievalConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid('检索配置无效');
  const config = value as Record<string, unknown>;
  if (
    Object.keys(config).some(
      (key) => !['exact', 'keyword', 'trigram', 'vector', 'topK'].includes(key),
    )
  )
    invalid('包含未支持的检索配置');
  if (
    typeof config.exact !== 'boolean' ||
    typeof config.keyword !== 'boolean' ||
    typeof config.trigram !== 'boolean' ||
    config.vector !== false ||
    !Number.isInteger(config.topK) ||
    Number(config.topK) < 1 ||
    Number(config.topK) > 10 ||
    (!config.exact && !config.keyword) ||
    (config.trigram && !config.keyword)
  )
    invalid('检索配置无效；本阶段不支持向量或模型调用');
  return config as unknown as RetrievalConfig;
}
