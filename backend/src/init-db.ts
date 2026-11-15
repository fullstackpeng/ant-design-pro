import { createPrismaClient } from './database/prisma.factory.js';
import { seedDemoData } from './database/seed.js';

async function main() {
  const prisma = createPrismaClient();
  try {
    await seedDemoData(
      prisma,
      process.env.ADMIN_PASSWORD ?? '',
      process.env.DEMO_PASSWORD ?? process.env.ADMIN_PASSWORD ?? '',
    );
    console.log(
      'Demo tenants and memberships seeded. Existing credentials and memberships are preserved.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
