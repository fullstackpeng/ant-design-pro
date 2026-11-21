import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import {
  PlatformFilesController,
  SiteAssetsController,
  TenantFilesController,
} from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [
    TenantFilesController,
    PlatformFilesController,
    SiteAssetsController,
  ],
  providers: [FilesService],
})
export class FilesModule {}
