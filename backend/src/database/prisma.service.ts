import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { createPrismaAdapter } from './prisma.factory.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  constructor() {
    super({ adapter: createPrismaAdapter() });
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
