import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.js';
import type { SessionContext } from '../auth/session-context.js';
import { id, pagination, success } from '../common/validation.js';
import { PrismaService } from '../database/prisma.service.js';
import type { MqttMessageQueryDto } from './dto/mqtt-message.dto.js';

export interface RecordMessageInput {
  tenantId: bigint;
  brokerType: 'platform' | 'tenant';
  brokerId: bigint;
  topic: string;
  payload: string;
  payloadEncoding: string;
  qos: number;
  retain: boolean;
  direction: 'inbound' | 'outbound';
  idempotencyKey: string;
}

@Injectable()
export class MqttMessagesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: RecordMessageInput) {
    try {
      return await this.prisma.mqttMessage.create({
        data: {
          tenantId: input.tenantId,
          brokerType: input.brokerType,
          brokerId: input.brokerId,
          topic: input.topic,
          payload: input.payload,
          payloadEncoding: input.payloadEncoding,
          qos: input.qos,
          retain: input.retain,
          direction: input.direction,
          idempotencyKey: input.idempotencyKey,
        },
        select: { id: true },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return null;
      throw error;
    }
  }

  async list(query: MqttMessageQueryDto) {
    const where = {
      ...(query.tenantId ? { tenantId: id(query.tenantId) } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.topic
        ? {
            topic: {
              contains: query.topic,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.mqttMessage.findMany({
        where,
        ...pagination(query),
        orderBy: { id: 'desc' },
        include: { tenant: { select: { code: true, name: true } } },
      }),
      this.prisma.mqttMessage.count({ where }),
    ]);
    return {
      success: true as const,
      data: rows.map((row) => ({
        id: row.id.toString(),
        tenantId: row.tenantId.toString(),
        tenantCode: row.tenant.code,
        tenantName: row.tenant.name,
        brokerType: row.brokerType,
        brokerId: row.brokerId.toString(),
        topic: row.topic,
        payload: row.payload,
        payloadEncoding: row.payloadEncoding,
        qos: row.qos,
        retain: row.retain,
        direction: row.direction,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
    };
  }

  @AuditAction({
    event: 'mqtt-messages.cleanup',
    name: '清理 MQTT 消息',
    mode: 'database',
  })
  async cleanup(
    session: SessionContext,
    tenantIdParam: string | undefined,
    ip: string,
  ) {
    if (tenantIdParam && !/^[1-9]\d{0,18}$/.test(tenantIdParam))
      throw new BadRequestException({
        success: false,
        errorMessage: 'tenantId 必须是正整数 ID',
      });
    const tenantId = tenantIdParam ? id(tenantIdParam) : undefined;
    const result = await this.prisma.mqttMessage.deleteMany({
      where: tenantId ? { tenantId } : {},
    });
    await this.prisma.mqttSecretAudit.create({
      data: {
        actorId: id(session.userid),
        actorName: session.name.slice(0, 100),
        tenantId,
        action: 'cleanup',
        success: true,
        ip: ip.slice(0, 64),
      },
    });
    return success({ deleted: result.count });
  }
}
