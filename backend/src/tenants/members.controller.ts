import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { MembersService } from './members.service.js';

@Controller('api/tenant')
@RequireScope('tenant-admin')
export class MembersController {
  constructor(
    @Inject(MembersService) private readonly members: MembersService,
  ) {}

  @Get('members')
  @Header('Cache-Control', 'no-store')
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: Record<string, unknown>,
  ) {
    return this.members.list(session, query);
  }

  @Post('members')
  add(@CurrentSession() session: SessionContext, @Body() body: unknown) {
    return this.members.add(session, body);
  }

  @Patch('members/:id')
  update(
    @CurrentSession() session: SessionContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.members.update(session, id, body);
  }

  @Delete('members/:id')
  remove(@CurrentSession() session: SessionContext, @Param('id') id: string) {
    return this.members.update(session, id, null, true);
  }

  @Get('subscription')
  @RequireScope('tenant')
  @Header('Cache-Control', 'no-store')
  subscription(@CurrentSession() session: SessionContext) {
    return this.members.subscription(session);
  }
}
