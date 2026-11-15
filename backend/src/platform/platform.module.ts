import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
