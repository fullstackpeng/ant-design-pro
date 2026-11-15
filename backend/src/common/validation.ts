import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';

export function invalid(message: string): never {
  throw new BadRequestException({ success: false, errorMessage: message });
}

export function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid('请求参数无效');
  return value as Record<string, unknown>;
}

export function text(value: unknown, label: string, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    invalid(`${label}无效`);
  return value.trim();
}

export function code(value: unknown): string {
  const result = text(value, '编码', 64);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(result) || result === 'platform')
    invalid('编码需为小写字母、数字或连字符，且不能使用 platform');
  return result;
}

export function id(value: unknown): bigint {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value))
    invalid('ID 无效');
  const result = BigInt(value);
  if (result > 9223372036854775807n) invalid('ID 无效');
  return result;
}

export function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') invalid('状态无效');
  return value;
}

export function role(value: unknown): 'admin' | 'user' {
  if (value !== 'admin' && value !== 'user') invalid('角色无效');
  return value;
}

export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 1024)
    invalid('密码长度需为 8 至 1024 个字符');
  return value;
}

export function maxMembers(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100000
  )
    invalid('成员上限需为 1 至 100000 的整数');
  return value;
}

export function expiresAt(value: unknown): Date {
  if (typeof value !== 'string') invalid('到期时间无效');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    invalid('到期时间必须晚于当前时间');
  return date;
}

export function pagination(query: Record<string, unknown>) {
  const current = Number(query.current ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  if (
    !Number.isSafeInteger(current) ||
    current < 1 ||
    current > 100000 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  )
    invalid('分页参数无效');
  return { skip: (current - 1) * pageSize, take: pageSize };
}

export function tenantId(session: SessionContext): bigint {
  if (!session.tenant)
    throw new ForbiddenException({
      success: false,
      errorMessage: '需要租户身份',
    });
  return BigInt(session.tenant.id);
}

export function json(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  );
}

export function success(value: unknown) {
  return { success: true, data: json(value) };
}
