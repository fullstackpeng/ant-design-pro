import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import {
  NotificationInboxController,
  PlatformNotificationsController,
  TenantNotificationsController,
} from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PlatformNotificationsController,
    TenantNotificationsController,
    NotificationInboxController,
  ],
  providers: [NotificationsService],
})
export class NotificationsModule {}
