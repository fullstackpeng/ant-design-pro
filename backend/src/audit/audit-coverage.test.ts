import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RequestMethod, type Type } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import {
  MetadataScanner,
  ModulesContainer,
  NestFactory,
  Reflector,
} from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { MqttCredentialsService } from '../mqtt/mqtt-credentials.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import {
  AUDIT_ENDPOINT,
  type AuditEndpointOptions,
  auditActions,
} from './audit-action.js';
import { auditSnapshot } from './audit-context.js';

test('all actual HTTP handlers explicitly classify auditing and reference a real service action', async () => {
  process.env.DATABASE_URL =
    'postgresql://unused:unused@127.0.0.1:1/audit_coverage';
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const scanner = new MetadataScanner();
    const reflector = new Reflector();
    let audited = 0;
    let exempt = 0;
    for (const module of app.get(ModulesContainer).values()) {
      for (const wrapper of module.controllers.values()) {
        const controller = wrapper.metatype as Type | undefined;
        if (!controller) continue;
        for (const name of scanner.getAllMethodNames(controller.prototype)) {
          const handler: (...args: any[]) => unknown =
            controller.prototype[name];
          const method: number | undefined = Reflect.getMetadata(
            METHOD_METADATA,
            handler,
          );
          if (method === undefined) continue;
          const source: string = `${controller.name}.${name}`;
          const classification = reflector.get<AuditEndpointOptions>(
            AUDIT_ENDPOINT,
            handler,
          );
          assert(classification, `${source} must declare @AuditEndpoint`);
          if ('event' in classification) {
            assert(
              auditActions.has(classification.event),
              `${source}: missing service audit action ${classification.event}`,
            );
            audited++;
          } else {
            assert(
              classification.exempt.trim(),
              `${source}: missing exemption reason`,
            );
            assert.equal(
              method,
              RequestMethod.GET,
              `${source}: mutations must emit audit events`,
            );
            assert(
              !/download|reveal|export/i.test(
                String(Reflect.getMetadata(PATH_METADATA, handler)),
              ),
              `${source}: sensitive reads must be audited`,
            );
            exempt++;
          }
        }
      }
    }
    assert(
      audited > 70 && exempt > 30,
      `Unexpected coverage: ${audited} audited, ${exempt} exempt`,
    );
  } finally {
    await app.close();
  }
});

test('snapshots exclude secrets, arbitrary nested configuration and message/file bodies', () => {
  const snapshot = auditSnapshot({
    id: 1n,
    name: 'safe',
    password: 'password-marker',
    passwordHash: 'hash-marker',
    token: 'token-marker',
    cookie: 'cookie-marker',
    secrets: { key: 'secret-marker' },
    config: { url: 'https://signed.invalid?token=marker' },
    payload: 'payload-marker',
    contentHtml: 'html-marker',
    url: 'https://signed.invalid',
    permissions: ['members:read'],
    createdAt: new Date(),
    size: 42n,
  });
  assert.deepEqual(snapshot, {
    id: '1',
    name: 'safe',
    permissions: ['members:read'],
    size: '42',
  });
});

test('realtime business commands and background provisioning retain service audit wrappers', () => {
  for (const [prototype, method, event] of [
    [RealtimeGateway.prototype, 'performMqtt', 'realtime.mqtt'],
    [
      MqttCredentialsService.prototype,
      'provisionBackground',
      'mqtt-credentials.background-provision',
    ],
  ] as const) {
    const handler = Reflect.get(prototype, method);
    assert.equal(Reflect.getMetadata(AUDIT_ENDPOINT, handler)?.event, event);
    assert(auditActions.has(event));
  }
});
