import {
  Controller,
  Get,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountModule } from './account/account.module.js';
import { AuditMiddleware } from './audit/audit.middleware.js';
import { AuditModule } from './audit/audit.module.js';
import { AuditEndpoint } from './audit/audit-action.js';
import { AuthModule } from './auth/auth.module.js';
import { HelloResponseDto } from './auth/dto/auth-response.dto.js';
import { Public } from './auth/public.decorator.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { createValidationPipe } from './common/validation.pipe.js';
import { DatabaseModule } from './database/database.module.js';
import { DictionariesModule } from './dictionaries/dictionaries.module.js';
import { FilesModule } from './files/files.module.js';
import { MqttModule } from './mqtt/mqtt.module.js';
import { NavigationModule } from './navigation/navigation.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

@Controller('api')
@ApiTags('health')
class AppController {
  @Get('hello')
  @AuditEndpoint({ exempt: '连通性检查，无业务动作' })
  @Public()
  @ApiOperation({ operationId: 'hello', summary: '连通性检查' })
  @ApiOkResponse({ type: HelloResponseDto })
  getHello(): HelloResponseDto {
    return { success: true, data: { message: 'Hello World!' } };
  }
}

@Module({
  imports: [
    AuditModule,
    DatabaseModule,
    AuthModule,
    AccountModule,
    TenantsModule,
    PlatformModule,
    NavigationModule,
    DictionariesModule,
    StorageModule,
    FilesModule,
    NotificationsModule,
    MqttModule,
    QueueModule,
    RealtimeModule,
    ScheduledTasksModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('{*path}');
  }
}
