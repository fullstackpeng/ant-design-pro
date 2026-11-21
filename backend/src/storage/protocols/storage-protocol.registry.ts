import { BadRequestException, Injectable } from '@nestjs/common';
import { s3Protocol } from './s3/s3.protocol.js';
import type {
  StorageProtocolDefinition,
  StorageProtocolMeta,
} from './storage-protocol.types.js';

@Injectable()
export class StorageProtocolRegistry {
  private readonly definitions = new Map<string, StorageProtocolDefinition>();

  constructor() {
    this.register(s3Protocol);
  }

  register(definition: StorageProtocolDefinition): void {
    this.definitions.set(definition.protocol, definition);
  }

  require(protocol: string): StorageProtocolDefinition {
    const definition = this.definitions.get(protocol);
    if (!definition)
      throw new BadRequestException({
        success: false,
        errorMessage: '不支持的存储协议',
      });
    return definition;
  }

  list(): StorageProtocolMeta[] {
    return [...this.definitions.values()].map(
      ({ protocol, label, configFields, secretFields }) => ({
        protocol,
        label,
        configFields,
        secretFields,
      }),
    );
  }
}
