import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import type { SchemaObject } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createOpenApiDocument, setupOpenApi } from './openapi.js';

test('OpenAPI is complete, stable and can be served without a database connection', async () => {
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/openapi';
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const document = createOpenApiDocument(app);
    const snapshot = JSON.parse(
      await readFile(resolve('../config/backend.openapi.json'), 'utf8'),
    );
    assert.deepEqual(document, snapshot);
    const operations = Object.values(document.paths).flatMap((path) =>
      Object.entries(path)
        .filter(([method]) =>
          ['get', 'post', 'patch', 'delete'].includes(method),
        )
        .map(([, operation]) => operation),
    );
    assert.equal(operations.length, 151);
    const ids = operations.map((operation) => operation.operationId);
    assert.equal(new Set(ids).size, ids.length);
    const schemas = document.components?.schemas ?? {};
    const login = schemas.LoginDto as SchemaObject;
    assert.deepEqual(login.required, ['tenantCode', 'username', 'password']);
    const currentUser = schemas.CurrentUserDto as SchemaObject;
    assert(currentUser.properties);
    assert.equal(
      (currentUser.properties.tenant as SchemaObject).nullable,
      true,
    );
    const createPlan = schemas.CreatePlanDto as SchemaObject;
    assert(createPlan.properties);
    assert.equal(
      (createPlan.properties.maxMembers as SchemaObject).type,
      'integer',
    );
    for (const operation of operations) {
      assert(
        Object.keys(operation.responses).some((status) => /^[23]/.test(status)),
      );
      const body = operation.requestBody;
      if (body && !('$ref' in body)) {
        const content = body.content as
          | Record<string, { schema?: unknown }>
          | undefined;
        assert(Object.values(content ?? {}).some((entry) => entry.schema));
      }
    }
    const params =
      document.paths['/api/platform/tenants/{id}'].patch?.parameters;
    assert(
      params?.some(
        (param) =>
          !('$ref' in param) &&
          param.in === 'path' &&
          param.name === 'id' &&
          param.required,
      ),
    );
    assert(!JSON.stringify(document).includes('passwordHash'));
    assert(!JSON.stringify(document).includes('tokenHash'));
    assert(!JSON.stringify(document).includes('postgresql://'));
    setupOpenApi(app);
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const json = await fetch(`${base}/api/openapi.json`);
    assert.equal(json.status, 200);
    assert.deepEqual(await json.json(), document);
    const ui = await fetch(`${base}/api/docs`);
    assert.equal(ui.status, 200);
    assert((await ui.text()).includes('swagger-ui'));
  } finally {
    await app.close();
  }
});
