import { migrateQueue } from './queue.migration.js';

void migrateQueue()
  .then((version) => console.log(`BullMQ PostgreSQL schema ready: ${version}`))
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
