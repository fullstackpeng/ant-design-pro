import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Controller, Get, type Type } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import {
  MetadataScanner,
  ModulesContainer,
  NestFactory,
  Reflector,
} from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { registeredPages } from './page-registry.js';
import { permissionCatalog } from './permissions.js';
import {
  REQUIRED_PERMISSION,
  RequirePermission,
} from './require-permission.decorator.js';

interface PermissionReference {
  source: string;
  code: string;
}

function assertPermissionRegistry(
  permissions: readonly { code: string; requires: readonly string[] }[],
  references: readonly PermissionReference[] = [],
) {
  const errors: string[] = [];
  const registry = new Map<string, (typeof permissions)[number]>();
  for (const permission of permissions) {
    if (!permission.code || permission.code !== permission.code.trim())
      errors.push(
        `Invalid permission code: ${JSON.stringify(permission.code)}`,
      );
    if (registry.has(permission.code))
      errors.push(`Duplicate permission code: ${permission.code}`);
    registry.set(permission.code, permission);
  }
  for (const permission of permissions) {
    for (const required of permission.requires) {
      if (!registry.has(required))
        errors.push(
          `${permission.code} requires unregistered permission: ${required}`,
        );
    }
  }
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (code: string, path: string[]) => {
    if (visiting.has(code)) {
      errors.push(
        `Permission dependency cycle: ${[...path, code].join(' -> ')}`,
      );
      return;
    }
    if (visited.has(code)) return;
    visiting.add(code);
    for (const required of registry.get(code)?.requires ?? []) {
      if (registry.has(required)) visit(required, [...path, code]);
    }
    visiting.delete(code);
    visited.add(code);
  };
  for (const code of registry.keys()) visit(code, []);
  for (const reference of references) {
    if (!registry.has(reference.code))
      errors.push(
        `${reference.source} uses unregistered permission: ${reference.code}`,
      );
  }
  assert.equal(errors.length, 0, errors.join('\n'));
}

function controllerReferences(controllers: Type[]): PermissionReference[] {
  const scanner = new MetadataScanner();
  const reflector = new Reflector();
  const references: PermissionReference[] = [];
  for (const controller of controllers) {
    const classPermission = reflector.get<string>(
      REQUIRED_PERMISSION,
      controller,
    );
    if (classPermission !== undefined)
      references.push({ source: controller.name, code: classPermission });
    for (const method of scanner.getAllMethodNames(controller.prototype)) {
      const handler = controller.prototype[method];
      if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
      const permission = reflector.getAllAndOverride<string>(
        REQUIRED_PERMISSION,
        [handler, controller],
      );
      if (permission !== undefined)
        references.push({
          source: `${controller.name}.${method}`,
          code: permission,
        });
    }
  }
  return references;
}

test('registered pages and actual API controllers reference a valid permission registry without connecting to a database', async () => {
  process.env.DATABASE_URL =
    'postgresql://unused:unused@127.0.0.1:1/permissions';
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const controllers: Type[] = [];
    for (const module of app.get(ModulesContainer).values()) {
      for (const wrapper of module.controllers.values()) {
        if (wrapper.metatype) controllers.push(wrapper.metatype as Type);
      }
    }
    const references = controllerReferences(controllers);
    assert(
      references.length > 0,
      'Expected permission-protected API handlers to be discovered',
    );
    assertPermissionRegistry(permissionCatalog, [
      ...registeredPages.flatMap((page) =>
        page.permissionCode
          ? [{ source: `Page ${page.path}`, code: page.permissionCode }]
          : [],
      ),
      ...references,
    ]);
  } finally {
    await app.close();
  }
});

test('rejects duplicate page/action permission codes', () => {
  assert.throws(
    () =>
      assertPermissionRegistry([
        { code: 'members:read', requires: [] },
        { code: 'members:read', requires: [] },
      ]),
    /Duplicate permission code: members:read/,
  );
});

test('rejects unknown dependency codes with their originating permission', () => {
  assert.throws(
    () =>
      assertPermissionRegistry([
        { code: 'members:create', requires: ['members:missing'] },
      ]),
    /members:create requires unregistered permission: members:missing/,
  );
});

test('rejects self-dependencies and cycles involving multiple permissions', () => {
  assert.throws(
    () =>
      assertPermissionRegistry([
        { code: 'members:read', requires: ['members:read'] },
      ]),
    /dependency cycle: members:read -> members:read/,
  );
  assert.throws(
    () =>
      assertPermissionRegistry([
        { code: 'a:read', requires: ['b:read'] },
        { code: 'b:read', requires: ['c:read'] },
        { code: 'c:read', requires: ['a:read'] },
      ]),
    /dependency cycle: a:read -> b:read -> c:read -> a:read/,
  );
});

test('accepts shared dependencies and reports unregistered page references', () => {
  const permissions = [
    { code: 'members:read', requires: [] },
    { code: 'members:create', requires: ['members:read'] },
    { code: 'members:update', requires: ['members:read'] },
  ];
  assert.doesNotThrow(() => assertPermissionRegistry(permissions));
  assert.throws(
    () =>
      assertPermissionRegistry(permissions, [
        { source: 'Page /tenant/missing', code: 'members:missing' },
      ]),
    /Page \/tenant\/missing uses unregistered permission: members:missing/,
  );
});

@Controller('permission-check')
@RequirePermission('members:read')
class PermissionCheckController {
  @Get()
  @RequirePermission('members:missing')
  list() {}
}

@Controller('inherited-permission-check')
class InheritedPermissionCheckController extends PermissionCheckController {}

test('checks class permissions and inherited HTTP handlers from Nest metadata', () => {
  const references = controllerReferences([InheritedPermissionCheckController]);
  assert.deepEqual(references, [
    { source: 'InheritedPermissionCheckController', code: 'members:read' },
    {
      source: 'InheritedPermissionCheckController.list',
      code: 'members:missing',
    },
  ]);
  assert.throws(
    () =>
      assertPermissionRegistry(
        [{ code: 'members:read', requires: [] }],
        references,
      ),
    /InheritedPermissionCheckController.list uses unregistered permission: members:missing/,
  );
});
