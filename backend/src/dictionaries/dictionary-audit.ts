import type { SessionContext } from '../auth/session-context.js';
import { id, json } from '../common/validation.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { DictionaryReference } from './dictionary-reference.js';

export async function recordDictionaryAudit(
  tx: Prisma.TransactionClient,
  session: SessionContext,
  reference: DictionaryReference,
  entityType: 'type' | 'item',
  action: 'create' | 'update',
  before: object,
  after: object,
  targetValue = '',
) {
  await tx.dictionaryAudit.create({
    data: {
      scope: reference.scope,
      tenantId:
        reference.scope === 'tenant' && session.tenant
          ? id(session.tenant.id)
          : null,
      dictionaryCode: reference.code,
      entityType,
      action,
      targetValue,
      actorId: id(session.userid),
      actorName: session.name,
      before: json(before) as Prisma.InputJsonObject,
      after: json(after) as Prisma.InputJsonObject,
    },
  });
}
