import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module.js';
import { NavigationModule } from '../navigation/navigation.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';

@Module({
  imports: [DatabaseModule, NavigationModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class AuthModule {}
