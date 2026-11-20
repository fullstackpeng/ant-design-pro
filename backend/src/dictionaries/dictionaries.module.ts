import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DictionariesController } from './dictionaries.controller.js';
import { DictionariesService } from './dictionaries.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [DictionariesController],
  providers: [DictionariesService],
  exports: [DictionariesService],
})
export class DictionariesModule {}
