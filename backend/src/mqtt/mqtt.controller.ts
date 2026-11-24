import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuditEndpoint } from '../audit/audit-action.js';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import { RequireFeature } from '../auth/require-feature.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  MqttCredentialMetadataResponseDto,
  PlatformTenantMqttListResponseDto,
  PlatformTenantParamDto,
  RevealedMqttCredentialResponseDto,
  VerifyMqttCredentialDto,
} from './dto/mqtt-credential.dto.js';
import {
  MqttCleanupResponseDto,
  MqttMessageListResponseDto,
  MqttMessageQueryDto,
} from './dto/mqtt-message.dto.js';
import { UpdateMqttPlatformBrokerDto } from './dto/platform-broker.dto.js';
import { MqttPlatformBrokerResponseDto } from './dto/platform-broker-response.dto.js';
import {
  CreateTenantMqttBrokerDto,
  TenantMqttBrokerListResponseDto,
  UpdateTenantMqttBrokerDto,
} from './dto/tenant-broker.dto.js';
import { MQTT_FEATURE } from './mqtt.constants.js';
import { MqttBridgeService } from './mqtt-bridge.service.js';
import { MqttCredentialsService } from './mqtt-credentials.service.js';
import { MqttMessagesService } from './mqtt-messages.service.js';
import { PlatformMqttBrokerService } from './platform-broker.service.js';
import { TenantMqttBrokersService } from './tenant-brokers.service.js';

@Controller('api/platform/mqtt')
@RequireScope('platform')
@ApiTags('mqtt')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, PlatformTenantParamDto, MqttMessageQueryDto)
export class PlatformMqttController {
  constructor(
    @Inject(PlatformMqttBrokerService)
    private readonly platform: PlatformMqttBrokerService,
    @Inject(MqttCredentialsService)
    private readonly credentials: MqttCredentialsService,
    @Inject(TenantMqttBrokersService)
    private readonly tenantBrokers: TenantMqttBrokersService,
    @Inject(MqttMessagesService)
    private readonly messages: MqttMessagesService,
    @Inject(MqttBridgeService)
    private readonly bridge: MqttBridgeService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('broker')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getMqttPlatformBroker',
    summary: '查询平台 MQTT Broker 单例配置',
  })
  @ApiOkResponse({ type: MqttPlatformBrokerResponseDto })
  getBroker(): Promise<MqttPlatformBrokerResponseDto> {
    return this.platform.get();
  }

  @AuditEndpoint({ event: 'mqtt-platform.update', name: '修改平台 MQTT 配置' })
  @Patch('broker')
  @ApiOperation({
    operationId: 'updateMqttPlatformBroker',
    summary: '修改平台 MQTT Broker 配置',
  })
  @ApiBody({ type: UpdateMqttPlatformBrokerDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  updateBroker(
    @Body() body: UpdateMqttPlatformBrokerDto,
  ): Promise<EmptyResponseDto> {
    return this.platform.update(body);
  }

  @AuditEndpoint({ event: 'mqtt-platform.test', name: '测试平台 MQTT 连接' })
  @Post('broker/test')
  @ApiOperation({
    operationId: 'testMqttPlatformBroker',
    summary: '测试平台 Broker 管理连接',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  testBroker(): Promise<EmptyResponseDto> {
    return this.platform.test();
  }

  @AuditEndpoint({ event: 'mqtt-platform.provision', name: '配置 MQTT Bridge' })
  @Post('broker/provision-bridge')
  @ApiOperation({
    operationId: 'provisionMqttBridge',
    summary: '创建平台 Bridge 角色和账号',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  provisionBridge(): Promise<EmptyResponseDto> {
    return this.platform.provisionBridge();
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('broker/status')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getMqttBridgeStatus',
    summary: '查询 Bridge 持久连接状态',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              connected: { type: 'boolean' },
              brokerType: { type: 'string' },
              brokerId: { type: 'string' },
              tenantCode: { type: 'string' },
            },
          },
        },
      },
    },
  })
  bridgeStatus() {
    return { success: true as const, data: this.bridge.status() };
  }

  @AuditEndpoint({
    event: 'mqtt-admin.processOutbox',
    name: '重试 MQTT 发件箱',
  })
  @Post('outbox/process')
  @ApiOperation({
    operationId: 'processMqttOutbox',
    summary: '立即重试待发送的 MQTT 消息',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  async processOutbox(): Promise<EmptyResponseDto> {
    await this.bridge.processOutboxManually();
    return { success: true, data: null };
  }

  @AuditEndpoint({
    event: 'mqtt-admin.reconnect',
    name: '重新连接 MQTT Bridge',
  })
  @Post('broker/reconnect')
  @ApiOperation({
    operationId: 'reconnectMqttBridge',
    summary: '重新连接平台 Broker Bridge',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  async reconnect(): Promise<EmptyResponseDto> {
    await this.bridge.reconnectManually();
    return { success: true, data: null };
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('tenants')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listMqttTenantCredentials',
    summary: '查询租户平台 Broker 凭据开通状态',
  })
  @ApiOkResponse({ type: PlatformTenantMqttListResponseDto })
  tenants(): Promise<PlatformTenantMqttListResponseDto> {
    return this.credentials.listTenants();
  }

  @AuditEndpoint({
    event: 'mqtt-credentials.provision',
    name: '配置租户 MQTT 账号',
  })
  @Post('tenants/:tenantId/provision')
  @ApiOperation({
    operationId: 'provisionMqttTenantCredential',
    summary: '生成或重试租户凭据',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  provisionTenant(
    @Param() params: PlatformTenantParamDto,
  ): Promise<EmptyResponseDto> {
    return this.credentials.provisionTenant(BigInt(params.tenantId));
  }

  @AuditEndpoint({ event: 'mqtt-credentials.reveal', name: '查看 MQTT 凭据' })
  @Post('tenants/:tenantId/credentials/reveal')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'revealMqttTenantCredential',
    summary: '校验平台管理员登录密码后查看租户凭据',
  })
  @ApiBody({ type: VerifyMqttCredentialDto })
  @ApiCreatedResponse({ type: RevealedMqttCredentialResponseDto })
  revealTenant(
    @CurrentSession() session: SessionContext,
    @Param() params: PlatformTenantParamDto,
    @Body() body: VerifyMqttCredentialDto,
    @Ip() ip: string,
  ): Promise<RevealedMqttCredentialResponseDto> {
    return this.credentials.reveal(session, params.tenantId, body.password, ip);
  }

  @AuditEndpoint({ event: 'mqtt-credentials.rotate', name: '轮换 MQTT 凭据' })
  @Post('tenants/:tenantId/credentials/rotate')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'rotateMqttTenantCredential',
    summary: '校验平台管理员登录密码后轮换租户凭据',
  })
  @ApiBody({ type: VerifyMqttCredentialDto })
  @ApiCreatedResponse({ type: RevealedMqttCredentialResponseDto })
  rotateTenant(
    @CurrentSession() session: SessionContext,
    @Param() params: PlatformTenantParamDto,
    @Body() body: VerifyMqttCredentialDto,
    @Ip() ip: string,
  ): Promise<RevealedMqttCredentialResponseDto> {
    return this.credentials.rotate(session, params.tenantId, body.password, ip);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('brokers')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listPlatformMqttBrokers',
    summary: '查看所有租户自建 MQTT Broker',
  })
  @ApiOkResponse({ type: TenantMqttBrokerListResponseDto })
  brokers(): Promise<TenantMqttBrokerListResponseDto> {
    return this.tenantBrokers.listPlatform();
  }

  @AuditEndpoint({
    event: 'mqtt-platform-brokers.update',
    name: '平台修改租户 Broker',
  })
  @Patch('brokers/:id')
  @ApiOperation({
    operationId: 'updatePlatformMqttBroker',
    summary: '平台修改租户自建 Broker',
  })
  @ApiBody({ type: UpdateTenantMqttBrokerDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  updateBrokerRow(
    @Param() params: IdParamDto,
    @Body() body: UpdateTenantMqttBrokerDto,
  ): Promise<EmptyResponseDto> {
    return this.tenantBrokers.updatePlatform(params.id, body);
  }

  @AuditEndpoint({
    event: 'mqtt-platform-brokers.delete',
    name: '平台删除租户 Broker',
  })
  @Delete('brokers/:id')
  @ApiOperation({
    operationId: 'deletePlatformMqttBroker',
    summary: '平台删除租户自建 Broker',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  deleteBrokerRow(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.tenantBrokers.deletePlatform(params.id);
  }

  @AuditEndpoint({
    event: 'mqtt-platform-brokers.default',
    name: '平台设置默认 Broker',
  })
  @Post('brokers/:id/default')
  @ApiOperation({
    operationId: 'setDefaultPlatformMqttBroker',
    summary: '平台设置租户默认 Broker',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  setDefaultBrokerRow(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.tenantBrokers.setDefaultPlatform(params.id);
  }

  @AuditEndpoint({ event: 'mqtt-brokers.test', name: '测试 Broker 连接' })
  @Post('brokers/:id/test')
  @ApiOperation({
    operationId: 'testPlatformMqttBroker',
    summary: '测试租户自建 Broker',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  testBrokerRow(@Param() params: IdParamDto): Promise<EmptyResponseDto> {
    return this.tenantBrokers.test(params.id);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('messages')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listMqttMessages',
    summary: '分页查询 MQTT 消息',
  })
  @ApiOkResponse({ type: MqttMessageListResponseDto })
  listMessages(
    @Query() query: MqttMessageQueryDto,
  ): Promise<MqttMessageListResponseDto> {
    return this.messages.list(query);
  }

  @AuditEndpoint({ event: 'mqtt-messages.cleanup', name: '清理 MQTT 消息' })
  @Delete('messages')
  @ApiOperation({
    operationId: 'cleanupMqttMessages',
    summary: '按租户或全部清理 MQTT 消息',
  })
  @ApiQuery({
    name: 'tenantId',
    required: false,
    type: String,
    description: '仅清理该租户，省略表示全部',
  })
  @ApiOkResponse({ type: MqttCleanupResponseDto })
  cleanupMessages(
    @CurrentSession() session: SessionContext,
    @Query('tenantId') tenantId: string | undefined,
    @Ip() ip: string,
  ): Promise<MqttCleanupResponseDto> {
    return this.messages.cleanup(session, tenantId, ip);
  }
}

@Controller('api/tenant/mqtt')
@RequireScope('tenant')
@RequireFeature(MQTT_FEATURE)
@ApiTags('mqtt')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto)
export class TenantMqttController {
  constructor(
    @Inject(MqttCredentialsService)
    private readonly credentials: MqttCredentialsService,
    @Inject(TenantMqttBrokersService)
    private readonly tenantBrokers: TenantMqttBrokersService,
    @Inject(MqttBridgeService)
    private readonly bridge: MqttBridgeService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('credentials')
  @RequirePermission('mqtt:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getTenantMqttCredential',
    summary: '查询本租户平台 Broker 凭据信息',
  })
  @ApiOkResponse({ type: MqttCredentialMetadataResponseDto })
  metadata(
    @CurrentSession() session: SessionContext,
  ): Promise<MqttCredentialMetadataResponseDto> {
    return this.credentials.metadata(session);
  }

  @AuditEndpoint({ event: 'mqtt-credentials.reveal', name: '查看 MQTT 凭据' })
  @Post('credentials/reveal')
  @RequirePermission('mqtt:credentials')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'revealTenantMqttCredential',
    summary: '校验登录密码后查看本租户凭据',
  })
  @ApiBody({ type: VerifyMqttCredentialDto })
  @ApiCreatedResponse({ type: RevealedMqttCredentialResponseDto })
  reveal(
    @CurrentSession() session: SessionContext,
    @Body() body: VerifyMqttCredentialDto,
    @Ip() ip: string,
  ): Promise<RevealedMqttCredentialResponseDto> {
    return this.credentials.reveal(session, undefined, body.password, ip);
  }

  @AuditEndpoint({ event: 'mqtt-credentials.rotate', name: '轮换 MQTT 凭据' })
  @Post('credentials/rotate')
  @RequirePermission('mqtt:credentials')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'rotateTenantMqttCredential',
    summary: '校验登录密码后轮换本租户凭据',
  })
  @ApiBody({ type: VerifyMqttCredentialDto })
  @ApiCreatedResponse({ type: RevealedMqttCredentialResponseDto })
  rotate(
    @CurrentSession() session: SessionContext,
    @Body() body: VerifyMqttCredentialDto,
    @Ip() ip: string,
  ): Promise<RevealedMqttCredentialResponseDto> {
    return this.credentials.rotate(session, undefined, body.password, ip);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('brokers')
  @RequirePermission('mqtt:read')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listTenantMqttBrokers',
    summary: '查询本租户自建 MQTT Broker',
  })
  @ApiOkResponse({ type: TenantMqttBrokerListResponseDto })
  brokers(
    @CurrentSession() session: SessionContext,
  ): Promise<TenantMqttBrokerListResponseDto> {
    return this.tenantBrokers.listTenant(session);
  }

  @AuditEndpoint({ event: 'mqtt-brokers.create', name: '新增租户 Broker' })
  @Post('brokers')
  @RequirePermission('mqtt:manage')
  @ApiOperation({
    operationId: 'createTenantMqttBroker',
    summary: '新增本租户 MQTT Broker',
  })
  @ApiBody({ type: CreateTenantMqttBrokerDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  async createBroker(
    @CurrentSession() session: SessionContext,
    @Body() body: CreateTenantMqttBrokerDto,
  ): Promise<EmptyResponseDto> {
    const result = await this.tenantBrokers.createTenant(session, body);
    await this.bridge.startPersistent();
    return result;
  }

  @AuditEndpoint({ event: 'mqtt-brokers.update', name: '修改租户 Broker' })
  @Patch('brokers/:id')
  @RequirePermission('mqtt:manage')
  @ApiOperation({
    operationId: 'updateTenantMqttBroker',
    summary: '修改本租户 MQTT Broker',
  })
  @ApiBody({ type: UpdateTenantMqttBrokerDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  async updateBroker(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdateTenantMqttBrokerDto,
  ): Promise<EmptyResponseDto> {
    const result = await this.tenantBrokers.updateTenant(
      session,
      params.id,
      body,
    );
    await this.bridge.stopTenant(BigInt(params.id));
    await this.bridge.startPersistent();
    return result;
  }

  @AuditEndpoint({ event: 'mqtt-brokers.delete', name: '删除租户 Broker' })
  @Delete('brokers/:id')
  @RequirePermission('mqtt:manage')
  @ApiOperation({
    operationId: 'deleteTenantMqttBroker',
    summary: '删除本租户 MQTT Broker',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  async deleteBroker(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    const result = await this.tenantBrokers.deleteTenant(session, params.id);
    await this.bridge.stopTenant(BigInt(params.id));
    return result;
  }

  @AuditEndpoint({ event: 'mqtt-brokers.default', name: '设置租户默认 Broker' })
  @Post('brokers/:id/default')
  @RequirePermission('mqtt:manage')
  @ApiOperation({
    operationId: 'setDefaultTenantMqttBroker',
    summary: '设置本租户默认 MQTT Broker',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  setDefault(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.tenantBrokers.setDefaultTenant(session, params.id);
  }

  @AuditEndpoint({
    event: 'mqtt-brokers.tenant-test',
    name: '测试租户 Broker 连接',
  })
  @Post('brokers/:id/test')
  @RequirePermission('mqtt:test')
  @ApiOperation({
    operationId: 'testTenantMqttBroker',
    summary: '测试本租户 MQTT Broker',
  })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  testBroker(
    @CurrentSession() session: SessionContext,
    @Param() params: IdParamDto,
  ): Promise<EmptyResponseDto> {
    return this.tenantBrokers.testForTenant(session, params.id);
  }
}
