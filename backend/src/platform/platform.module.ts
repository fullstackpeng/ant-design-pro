import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController, UsersController, SettingsController],
  providers: [PlatformService, UsersService, SettingsService],
})
export class PlatformModule {}
