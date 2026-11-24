import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import {
  PlatformAuditController,
  TenantAuditController,
} from './audit.controller.js';
import { AuditMiddleware } from './audit.middleware.js';
import { AuditService } from './audit.service.js';
import { AuditCleanupService } from './audit-cleanup.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformAuditController, TenantAuditController],
  providers: [AuditService, AuditMiddleware, AuditCleanupService],
  exports: [AuditMiddleware, AuditCleanupService],
})
export class AuditModule {}
