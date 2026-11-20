import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthModule } from './auth/auth.module.js';
import { HelloResponseDto } from './auth/dto/auth-response.dto.js';
import { Public } from './auth/public.decorator.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { createValidationPipe } from './common/validation.pipe.js';
import { DictionariesModule } from './dictionaries/dictionaries.module.js';
import { NavigationModule } from './navigation/navigation.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

@Controller('api')
@ApiTags('health')
class AppController {
  @Get('hello')
  @Public()
  @ApiOperation({ operationId: 'hello', summary: '连通性检查' })
  @ApiOkResponse({ type: HelloResponseDto })
  getHello(): HelloResponseDto {
    return { success: true, data: { message: 'Hello World!' } };
  }
}

@Module({
  imports: [
    AuthModule,
    TenantsModule,
    PlatformModule,
    NavigationModule,
    DictionariesModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
