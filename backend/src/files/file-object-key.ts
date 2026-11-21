import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

/**
 * Object keys are protocol-agnostic: every storage driver receives the same
 * layout. Dates use UTC so the path does not change with server timezone.
 */
export function buildObjectKey(
  tenantId: bigint | null,
  originalName: string,
  now = new Date(),
  id: string = randomUUID(),
): string {
  const extension = extname(originalName).toLowerCase();
  const safeExtension = /^\.[a-z0-9]{1,16}$/.test(extension) ? extension : '';
  const date = now.toISOString().slice(0, 10).replaceAll('-', '/');
  const scope = tenantId ? `tenants/${tenantId}` : 'platform';
  return `${scope}/${date}/${id}${safeExtension}`;
}
