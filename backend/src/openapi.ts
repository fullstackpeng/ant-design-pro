import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Ant Design Pro Backend')
    .setDescription(
      '共享表多租户管理 API。登录使用 HttpOnly Cookie；可选 X-Tenant-ID 必须与会话租户一致。ID 均为字符串，时间均为 ISO 8601。',
    )
    .setVersion('1.0.0')
    .addCookieAuth('antd_session', { type: 'apiKey', in: 'cookie' }, 'session')
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupOpenApi(app: INestApplication): void {
  if (process.env.NODE_ENV === 'production') return;
  SwaggerModule.setup('api/docs', app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: '/api/openapi.json',
  });
}
