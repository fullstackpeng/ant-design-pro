import { runMigrations } from 'bullmq';
import { Pool } from 'pg';
import { queueConfig } from './queue.config.js';

export async function migrateQueue(config = queueConfig()) {
  const { schema, migrate: _migrate, ...connection } = config.connection;
  const pool = new Pool(connection);
  try {
    const client = await pool.connect();
    try {
      return await runMigrations(client, schema);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
