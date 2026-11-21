import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import {
  PlatformMqttController,
  TenantMqttController,
} from './mqtt.controller.js';
import { MqttBridgeService } from './mqtt-bridge.service.js';
import { MqttCredentialsService } from './mqtt-credentials.service.js';
import { MqttMessagesService } from './mqtt-messages.service.js';
import { PlatformMqttBrokerService } from './platform-broker.service.js';
import { TenantMqttBrokersService } from './tenant-brokers.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformMqttController, TenantMqttController],
  providers: [
    PlatformMqttBrokerService,
    MqttCredentialsService,
    TenantMqttBrokersService,
    MqttMessagesService,
    MqttBridgeService,
  ],
  exports: [
    PlatformMqttBrokerService,
    MqttCredentialsService,
    TenantMqttBrokersService,
    MqttMessagesService,
    MqttBridgeService,
  ],
})
export class MqttModule {}
