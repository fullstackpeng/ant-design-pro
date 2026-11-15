import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function createPrismaAdapter(): PrismaPg {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Configure backend/.env first.');
  }
  const schema =
    new URL(connectionString).searchParams.get('schema') ?? 'public';
  return new PrismaPg(
    { connectionString, connectionTimeoutMillis: 5000 },
    { schema },
  );
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter() });
}
