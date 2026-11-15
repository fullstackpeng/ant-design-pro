import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { createOpenApiDocument } from './openapi.js';

async function main() {
  // Document generation inspects metadata only; no database connection is opened.
  process.env.DATABASE_URL ??= 'postgresql://unused:unused@127.0.0.1:1/openapi';
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const destination = resolve(__dirname, '../../config/backend.openapi.json');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(
      destination,
      `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`,
    );
    console.log(`OpenAPI exported to ${destination}`);
  } finally {
    await app.close();
  }
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
