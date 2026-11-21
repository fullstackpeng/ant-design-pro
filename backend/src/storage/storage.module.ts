import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageProtocolRegistry } from './protocols/storage-protocol.registry.js';
import { StorageController } from './storage.controller.js';
import { StorageProvidersService } from './storage-providers.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [StorageController],
  providers: [StorageProtocolRegistry, StorageProvidersService],
  exports: [StorageProtocolRegistry, StorageProvidersService],
})
export class StorageModule {}
