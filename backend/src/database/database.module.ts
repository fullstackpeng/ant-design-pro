import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { createAuditedPrismaService, PrismaService } from './prisma.service.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

@Module({
  providers: [
    { provide: PrismaService, useFactory: createAuditedPrismaService },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
