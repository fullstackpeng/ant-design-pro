import { Pool } from 'pg';
import { hashPassword } from './password.js';

export function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Configure backend/.env first.');
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
}

export async function initializeDatabase(pool: Pool, password: string) {
  if (!password) throw new Error('ADMIN_PASSWORD is required.');
  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        access VARCHAR(20) NOT NULL DEFAULT 'user'
          CHECK (access IN ('admin', 'user'))
      );
      CREATE TABLE IF NOT EXISTS app_sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
    await client.query(
      `INSERT INTO app_users (username, password_hash, name, access)
       VALUES ('admin', $1, '管理员', 'admin')
       ON CONFLICT (username) DO NOTHING`,
      [passwordHash],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
