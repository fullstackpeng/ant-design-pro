import { hashPassword } from '../auth/password.js';
import type { PrismaClient } from '../generated/prisma/client.js';

export async function seedDemoData(
  prisma: PrismaClient,
  adminPassword: string,
  demoPassword = adminPassword,
  platformPassword = adminPassword,
) {
  if (!adminPassword || !demoPassword || !platformPassword)
    throw new Error('Seed passwords are required.');
  const [adminHash, demoHash, platformHash] = await Promise.all([
    hashPassword(adminPassword),
    hashPassword(demoPassword),
    hashPassword(platformPassword),
  ]);
  await prisma.$transaction(async (tx) => {
    const platform = await tx.user.upsert({
      where: { username: 'platform-admin' },
      update: {},
      create: {
        username: 'platform-admin',
        name: '平台管理员',
        passwordHash: platformHash,
        isPlatformAdmin: true,
      },
    });
    if (!platform.isPlatformAdmin)
      throw new Error(
        'platform-admin is already used by a non-platform account.',
      );
    const plan = await tx.plan.upsert({
      where: { code: 'basic' },
      update: {},
      create: { code: 'basic', name: '基础套餐', maxMembers: 10 },
    });
    const tenantA = await tx.tenant.upsert({
      where: { code: 'tenant-a' },
      update: {},
      create: {
        code: 'tenant-a',
        name: '示例企业 A',
        features: {
          create: (await tx.feature.findMany()).map((feature) => ({
            featureCode: feature.code,
          })),
        },
      },
    });
    const tenantB = await tx.tenant.upsert({
      where: { code: 'tenant-b' },
      update: {},
      create: {
        code: 'tenant-b',
        name: '示例企业 B',
        features: {
          create: (await tx.feature.findMany()).map((feature) => ({
            featureCode: feature.code,
          })),
        },
      },
    });
    const admin = await tx.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: { username: 'admin', name: '管理员', passwordHash: adminHash },
    });
    const userA = await tx.user.upsert({
      where: { username: 'tenant-a-user' },
      update: {},
      create: {
        username: 'tenant-a-user',
        name: 'A 企业成员',
        passwordHash: demoHash,
      },
    });
    const userB = await tx.user.upsert({
      where: { username: 'tenant-b-user' },
      update: {},
      create: {
        username: 'tenant-b-user',
        name: 'B 企业管理员',
        passwordHash: demoHash,
      },
    });
    for (const membership of [
      { tenantId: tenantA.id, userId: admin.id, role: 'admin' },
      { tenantId: tenantB.id, userId: admin.id, role: 'user' },
      { tenantId: tenantA.id, userId: userA.id, role: 'user' },
      { tenantId: tenantB.id, userId: userB.id, role: 'admin' },
    ]) {
      await tx.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: membership.tenantId,
            userId: membership.userId,
          },
        },
        update: {},
        create: membership,
      });
    }
    for (const tenant of [tenantA, tenantB]) {
      await tx.subscription.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
          tenantId: tenant.id,
          planId: plan.id,
          expiresAt: new Date(Date.now() + 365 * 86400000),
        },
      });
    }
  });
}
