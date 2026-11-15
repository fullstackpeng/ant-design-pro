import { Controller, Get, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { Public } from './auth/public.decorator.js';
import { PlatformModule } from './platform/platform.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

@Controller('api')
class AppController {
  @Get('hello')
  @Public()
  getHello() {
    return { success: true, data: { message: 'Hello World!' } };
  }
}

@Module({
  imports: [AuthModule, TenantsModule, PlatformModule],
  controllers: [AppController],
})
export class AppModule {}
