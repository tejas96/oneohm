import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import configuration from '../config/configuration';
import { createDataSourceOptions } from '../database/datasource';

import type { Configuration as ConfigInterface } from '../config/config.interface';
import type { ConfigService } from '@nestjs/config';

// Load environment variables
config({ path: '.env' });

// Create configuration object
const configObj = configuration();

// Mock ConfigService for migrations
const configService: ConfigService<ConfigInterface> = {
  get: <K extends keyof ConfigInterface>(key: K): ConfigInterface[K] => {
    const keys = key.split('.');
    let value: unknown = configObj;

    for (const k of keys) {
      value = value?.[k];
    }

    return value as ConfigInterface[K];
  },
} as ConfigService<ConfigInterface>;

// Export DataSource for TypeORM CLI
export default new DataSource(createDataSourceOptions(configService));
