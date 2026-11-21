import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DictionariesController } from './dictionaries.controller.js';
import { DictionariesService } from './dictionaries.service.js';
import {
  PlatformDictionariesController,
  PlatformDictionaryLookupController,
} from './platform-dictionaries.controller.js';
import { PlatformDictionariesService } from './platform-dictionaries.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    DictionariesController,
    PlatformDictionariesController,
    PlatformDictionaryLookupController,
  ],
  providers: [DictionariesService, PlatformDictionariesService],
  exports: [DictionariesService],
})
export class DictionariesModule {}
