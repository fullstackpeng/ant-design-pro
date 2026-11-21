import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../auth/authorization.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { MqttModule } from '../mqtt/mqtt.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  imports: [AuthModule, AuthorizationModule, DatabaseModule, MqttModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
