import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { setupOpenApi } from './openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const trustedProxies = process.env.TRUST_PROXY?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (trustedProxies?.length)
    app.getHttpAdapter().getInstance().set('trust proxy', trustedProxies);
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(cookieParser());
  app.enableShutdownHooks();
  setupOpenApi(app);
  await app.listen(3000);
}

void bootstrap();
