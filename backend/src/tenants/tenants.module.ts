import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DepartmentsController } from './departments.controller.js';
import { DepartmentsService } from './departments.service.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
import { PositionsController } from './positions.controller.js';
import { PositionsService } from './positions.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    DepartmentsController,
    PositionsController,
    TenantsController,
    MembersController,
    RolesController,
  ],
  providers: [
    DepartmentsService,
    PositionsService,
    MembersService,
    RolesService,
  ],
})
export class TenantsModule {}
