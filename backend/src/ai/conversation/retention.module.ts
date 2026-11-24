import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AiPolicyService } from './policy.service.js';
import { AiRetentionCleanupService } from './retention-cleanup.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [AiPolicyService, AiRetentionCleanupService],
  exports: [AiPolicyService, AiRetentionCleanupService],
})
export class AiRetentionModule {}
