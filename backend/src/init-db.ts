import { createPool, initializeDatabase } from './database.js';

async function main() {
  const pool = createPool();
  try {
    await initializeDatabase(pool, process.env.ADMIN_PASSWORD ?? '');
    console.log(
      'Database initialized. Existing admin credentials are preserved.',
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
