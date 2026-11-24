import { auditContext, auditSnapshot } from './audit-context.js';

const mutations = new Set([
  'create',
  'update',
  'upsert',
  'delete',
  'createMany',
  'updateMany',
  'deleteMany',
  'createManyAndReturn',
  'updateManyAndReturn',
]);
const excluded =
  /^(session|operationLog|loginLog|auditPolicy|.*Audit|taskAttempt|taskRun|mqttMessage|mqttOutbox)$/;

/** Wrap transaction delegates to collect bounded, allowlisted business changes. */
export function auditClient<T extends object>(
  client: T,
  atomic?: (
    model: string,
    operation: string,
    args: Record<string, unknown>,
  ) => Promise<unknown>,
): T {
  const proxy = new Proxy(client as object, {
    get(target, property, receiver) {
      const delegate = Reflect.get(target, property, receiver);
      if (
        typeof property !== 'string' ||
        property.startsWith('$') ||
        !delegate ||
        typeof delegate !== 'object' ||
        excluded.test(property)
      )
        return delegate;
      return new Proxy(delegate, {
        get(model, operation) {
          const method = Reflect.get(model, operation);
          if (typeof method !== 'function') return method;
          if (!mutations.has(String(operation))) return method.bind(model);
          return async (args: Record<string, unknown>) => {
            const action = auditContext.getStore()?.action;
            if (!action || action.closed) return method.call(model, args);
            if (
              atomic &&
              action.external &&
              !auditContext.getStore()?.transaction
            )
              return atomic(property, String(operation), args);
            const single = ['update', 'upsert', 'delete'].includes(
              String(operation),
            );
            const findUnique = Reflect.get(model as object, 'findUnique') as (
              args: unknown,
            ) => Promise<unknown>;
            const before =
              single && args.where
                ? await findUnique.call(model, { where: args.where })
                : undefined;
            const result = await method.call(model, args);
            if (action.changes.length < 50) {
              // A select:{id:true} response must not erase the safe input fields.
              const data = args.data ?? args.create;
              action.changes.push({
                entity: property,
                operation: String(operation),
                before: single
                  ? auditSnapshot(before)
                  : auditSnapshot(args.where),
                after:
                  operation === 'delete'
                    ? {}
                    : Array.isArray(data)
                      ? {
                          count:
                            (result as { count?: number })?.count ??
                            data.length,
                          records: data.slice(0, 50).map(auditSnapshot),
                          truncated: data.length > 50,
                        }
                      : {
                          ...auditSnapshot(data),
                          ...auditSnapshot(result),
                          ...(typeof (result as { count?: number })?.count ===
                          'number'
                            ? { count: (result as { count: number }).count }
                            : {}),
                        },
              });
            }
            return result;
          };
        },
      });
    },
  });
  return proxy as T;
}
