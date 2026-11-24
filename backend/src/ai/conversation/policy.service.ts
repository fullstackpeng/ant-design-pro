import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AuditAction } from '../../audit/audit-action.js';
import { success } from '../../common/validation.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpdateAiPolicyDto } from './dto/policy-request.dto.js';

@Injectable()
export class AiPolicyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async effective() {
    const policy = await this.prisma.aiPolicy.findUniqueOrThrow({
      where: { id: 1 },
    });
    if (
      !Number.isInteger(policy.conversationRetentionDays) ||
      policy.conversationRetentionDays < 1 ||
      policy.conversationRetentionDays > 3650
    )
      throw new Error('Invalid AI retention policy');
    return {
      conversationRetentionDays: policy.conversationRetentionDays,
      revision: policy.revision,
    };
  }
  async get() {
    return success(await this.effective());
  }
  async cutoff() {
    return new Date(
      Date.now() -
        (await this.effective()).conversationRetentionDays * 86400000,
    );
  }

  @AuditAction({
    event: 'ai.policy.update',
    name: '修改 AI 会话保留策略',
    entity: 'aiPolicy',
  })
  async update(body: UpdateAiPolicyDto) {
    await this.prisma
      .$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(11242026, 2)`;
    const current = await this.effective();
    if (current.revision !== body.revision)
      throw new ConflictException('保留策略已修改，请刷新');
    await this.prisma.aiPolicy.update({
      where: { id: 1, revision: body.revision },
      data: {
        conversationRetentionDays: body.conversationRetentionDays,
        revision: { increment: 1 },
      },
    });
    return this.get();
  }
}
