import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantsController, MembersController],
  providers: [MembersService],
})
export class TenantsModule {}
