import { resolve } from 'path';

import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import configuration from '../config/configuration';
import { createDataSourceOptions } from '../database/datasource';

import type { Configuration as ConfigInterface } from '../config/config.interface';
import type { ConfigService } from '@nestjs/config';

// Load environment variables from apps/backend/.env
config({ path: resolve(__dirname, '../../.env') });

// Create configuration object
const configObj = configuration();

// Mock ConfigService for migrations
const configService: ConfigService<ConfigInterface> = {
  get: <K extends keyof ConfigInterface>(key: K): ConfigInterface[K] => {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = configObj; // Need 'any' for dynamic property access

    for (const k of keys) {
      value = value?.[k];
    }

    return value as ConfigInterface[K];
  },
} as ConfigService<ConfigInterface>;

// Export DataSource for TypeORM CLI
export default new DataSource(createDataSourceOptions(configService));
