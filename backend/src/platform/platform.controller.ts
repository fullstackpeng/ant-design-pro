import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { PlatformService } from './platform.service.js';

@Controller('api/platform')
@RequireScope('platform')
export class PlatformController {
  constructor(
    @Inject(PlatformService) private readonly platform: PlatformService,
  ) {}

  @Get('tenants')
  @Header('Cache-Control', 'no-store')
  tenants(@Query() query: Record<string, unknown>) {
    return this.platform.tenants(query);
  }

  @Post('tenants')
  createTenant(@Body() body: unknown) {
    return this.platform.createTenant(body);
  }

  @Patch('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() body: unknown) {
    return this.platform.updateTenant(id, body);
  }

  @Get('plans')
  @Header('Cache-Control', 'no-store')
  plans(@Query() query: Record<string, unknown>) {
    return this.platform.plans(query);
  }

  @Post('plans')
  createPlan(@Body() body: unknown) {
    return this.platform.createPlan(body);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: unknown) {
    return this.platform.updatePlan(id, body);
  }

  @Post('tenants/:id/subscription')
  assign(@Param('id') id: string, @Body() body: unknown) {
    return this.platform.assign(id, body);
  }
}
