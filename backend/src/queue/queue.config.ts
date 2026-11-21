export function queueConfig(env: NodeJS.ProcessEnv = process.env) {
  const value = env.QUEUE_DATABASE_URL || env.DATABASE_URL;
  if (!value)
    throw new Error('QUEUE_DATABASE_URL or DATABASE_URL is required.');
  const url = postgresUrl(value);

  // Prisma's schema URL parameter must never select the queue namespace.
  const businessSchema = env.DATABASE_URL
    ? (postgresUrl(env.DATABASE_URL).searchParams.get('schema') ?? 'public')
    : 'public';
  const urlSchema = url.searchParams.get('schema');
  url.searchParams.delete('schema');
  const schema = env.QUEUE_SCHEMA ?? 'bullmq';
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema))
    throw new Error('QUEUE_SCHEMA must be a lowercase PostgreSQL identifier.');
  if (
    schema === 'public' ||
    schema === businessSchema ||
    schema === urlSchema ||
    schema === 'information_schema' ||
    schema.startsWith('pg_')
  )
    throw new Error(
      'QUEUE_SCHEMA must be separate from business/system schemas.',
    );

  return {
    connection: {
      connectionString: url.toString(),
      schema,
      max: positiveInteger(env, 'QUEUE_POOL_SIZE', 5, 50),
      connectionTimeoutMillis: 5000,
      migrate: false,
    },
    concurrency: positiveInteger(env, 'QUEUE_WORKER_CONCURRENCY', 2, 100),
  };
}

function postgresUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Queue database URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Queue database URL must use PostgreSQL.');
  return url;
}

function positiveInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  maximum: number,
) {
  const value = env[key];
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value) || Number(value) > maximum)
    throw new Error(`${key} must be an integer between 1 and ${maximum}.`);
  return Number(value);
}
