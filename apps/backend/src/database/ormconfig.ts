import { resolve } from 'path';

import type { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import type { Configuration as ConfigInterface } from '../config/config.interface';
import configuration from '../config/configuration';
import { createDataSourceOptions } from '../database/datasource';


// Load environment variables from apps/backend/.env
config({ path: resolve(__dirname, '../../.env') });

// Create configuration object
const configObj = configuration();

// Mock ConfigService for migrations
const configService: ConfigService<ConfigInterface> = {
  get: <K extends keyof ConfigInterface>(key: K): ConfigInterface[K] => {
    const keys = key.split('.');
    let value: unknown = configObj; // Start with unknown for type safety

    for (const k of keys) {
      // Navigate through object structure (defensive optional chaining)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      value = (value as Record<string, unknown>)?.[k];
    }

    return value as ConfigInterface[K];
  },
} as ConfigService<ConfigInterface>;

// Export DataSource for TypeORM CLI
// eslint-disable-next-line import/no-default-export -- Required for TypeORM CLI
export default new DataSource(createDataSourceOptions(configService));
