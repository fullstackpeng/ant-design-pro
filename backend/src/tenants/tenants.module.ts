import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantsController, MembersController, RolesController],
  providers: [MembersService, RolesService],
})
export class TenantsModule {}
