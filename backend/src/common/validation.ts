import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { SessionContext } from '../auth/session-context.js';
import type { PaginationQueryDto } from './dto/request.dto.js';

export function invalid(message: string): never {
  throw new BadRequestException({ success: false, errorMessage: message });
}

export function id(value: string): bigint {
  return BigInt(value);
}

export function expiresAt(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    invalid('到期时间必须晚于当前时间');
  return date;
}

export function pagination(query: PaginationQueryDto) {
  return { skip: (query.current - 1) * query.pageSize, take: query.pageSize };
}

export function tenantId(session: SessionContext): bigint {
  if (!session.tenant)
    throw new ForbiddenException({
      success: false,
      errorMessage: '需要租户身份',
    });
  return BigInt(session.tenant.id);
}

export type JsonValue<T> = T extends bigint | Date
  ? string
  : T extends readonly (infer Item)[]
    ? JsonValue<Item>[]
    : T extends object
      ? { [Key in keyof T]: JsonValue<T[Key]> }
      : T;

export function json<T>(value: T): JsonValue<T> {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  ) as JsonValue<T>;
}

export function success<T>(value: T): { success: true; data: JsonValue<T> } {
  return { success: true, data: json(value) };
}
