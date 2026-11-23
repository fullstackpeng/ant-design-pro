import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import {
  NotificationAssetsController,
  PlatformFilesController,
  PlatformNotificationImagesController,
  SiteAssetsController,
  TenantFilesController,
  TenantNotificationImagesController,
} from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [
    TenantFilesController,
    PlatformFilesController,
    SiteAssetsController,
    TenantNotificationImagesController,
    PlatformNotificationImagesController,
    NotificationAssetsController,
  ],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
